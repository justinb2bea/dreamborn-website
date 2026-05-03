#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const {
  AccountId,
  Client,
  PrivateKey,
  TopicId,
  TopicMessageSubmitTransaction,
} = require('@hashgraph/sdk');

const POSTS_DIR = path.join(process.cwd(), 'src', '_data', 'generated_posts');

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const all = args.includes('--all');
  const target = args.find((arg) => !arg.startsWith('--'));

  if (!all && !target) {
    fail('Usage: node scripts/publish-hcs-content-receipt.js <slug-or-json-path> [--dry-run]\n       node scripts/publish-hcs-content-receipt.js --all [--dry-run]');
  }

  const files = all ? listPostFiles() : [resolvePostFile(target)];
  const client = dryRun ? null : createDreambornClient();
  const topicId = getReceiptTopicId();

  try {
    const results = [];
    for (const file of files) {
      const result = await publishReceiptForFile({ file, topicId, client, dryRun });
      results.push(result);
    }
    console.log(JSON.stringify(results, null, 2));
  } finally {
    if (client) client.close();
  }
}

function createDreambornClient() {
  const operatorId =
    process.env.DREAMBORN_OPERATOR_ID ||
    process.env.BEZELIQ_OPERATOR_ID ||
    process.env.HEDERA_OPERATOR_ID ||
    process.env.HEDERA_ACCOUNT_ID;

  const operatorKey =
    process.env.DREAMBORN_OPERATOR_KEY ||
    process.env.BEZELIQ_OPERATOR_KEY ||
    process.env.HEDERA_OPERATOR_KEY ||
    process.env.HEDERA_PRIVATE_KEY;

  const network = getDreambornNetwork();

  if (!operatorId || !operatorKey) {
    fail('DREAMBORN_OPERATOR_ID and DREAMBORN_OPERATOR_KEY are required');
  }

  const client = network === 'mainnet' ? Client.forMainnet() : Client.forTestnet();
  client.setOperator(AccountId.fromString(operatorId), PrivateKey.fromStringED25519(operatorKey));
  return client;
}

function getReceiptTopicId() {
  const topicId = process.env.DREAMBORN_CONTENT_TOPIC || process.env.DREAMBORN_HISTORY_TOPIC;
  if (!topicId) fail('DREAMBORN_CONTENT_TOPIC or DREAMBORN_HISTORY_TOPIC is required');
  return topicId;
}

function getDreambornNetwork() {
  return process.env.DREAMBORN_HEDERA_NETWORK || process.env.HEDERA_NETWORK || 'testnet';
}

function getHashScanBaseUrl(network) {
  return network === 'mainnet' ? 'https://hashscan.io/mainnet' : 'https://hashscan.io/testnet';
}

async function publishReceiptForFile({ file, topicId, client, dryRun }) {
  const post = readJson(file);
  const canonical = canonicalizePost(post);
  const bodySha256 = sha256(canonical.body_html || '');
  const receiptSha256 = sha256(stableJson(canonical));
  const previousReceipt = post.hcs_receipt || null;

  if (previousReceipt?.receipt_sha256 === receiptSha256 && !dryRun) {
    return {
      slug: post.slug,
      file: path.relative(process.cwd(), file),
      skipped: true,
      reason: 'receipt already matches current content',
      hcs_receipt: previousReceipt,
    };
  }

  const event = {
    wire: '1.1',
    wire_id: `content.${post.slug}.${receiptSha256.slice(0, 16)}`,
    stream_id: `content:thinking:${post.slug}`,
    stream_seq: previousReceipt?.stream_seq ? previousReceipt.stream_seq + 1 : 1,
    correlation_id: 'site:dreamborn.ai:thinking',
    type: 'content.published',
    sender: 'dreamborn:publisher',
    ts: new Date().toISOString(),
    payload: {
      site: 'dreamborn.ai',
      collection: 'thinking',
      slug: post.slug,
      title: post.title,
      author: post.author,
      published_at: post.published_at,
      body_sha256: bodySha256,
      receipt_sha256: receiptSha256,
      source_file: path.relative(process.cwd(), file),
      previous_receipt: previousReceipt
        ? {
            topic_id: previousReceipt.topic_id,
            sequence_number: previousReceipt.sequence_number,
            transaction_id: previousReceipt.transaction_id,
            receipt_sha256: previousReceipt.receipt_sha256,
          }
        : null,
    },
  };

  if (dryRun) {
    return {
      slug: post.slug,
      file: path.relative(process.cwd(), file),
      dry_run: true,
      topic_id: topicId,
      body_sha256: bodySha256,
      receipt_sha256: receiptSha256,
      event,
    };
  }

  const response = await new TopicMessageSubmitTransaction()
    .setTopicId(TopicId.fromString(topicId))
    .setMessage(JSON.stringify(event))
    .setChunkSize(4096)
    .execute(client);

  const txId = response.transactionId.toString();
  const record = await response.getRecord(client);
  const receipt = {
    status: 'verified',
    network: getDreambornNetwork(),
    topic_id: topicId,
    sequence_number: record.receipt.topicSequenceNumber.toString(),
    transaction_id: txId,
    consensus_timestamp: record.consensusTimestamp.toDate().toISOString(),
    body_sha256: bodySha256,
    receipt_sha256: receiptSha256,
    stream_id: event.stream_id,
    stream_seq: event.stream_seq,
    event_type: event.type,
    verified_at: new Date().toISOString(),
    hashscan_url: `${getHashScanBaseUrl(getDreambornNetwork())}/transaction/${encodeURIComponent(txId)}`,
  };

  writeJson(file, {
    ...post,
    hcs_receipt: receipt,
  });

  return {
    slug: post.slug,
    file: path.relative(process.cwd(), file),
    hcs_receipt: receipt,
  };
}

function canonicalizePost(post) {
  return {
    id: post.id,
    title: post.title,
    slug: post.slug,
    excerpt: post.excerpt,
    author: post.author,
    status: post.status,
    topic_ids: post.topic_ids || [],
    topic_label: post.topic_label || null,
    published_at: post.published_at,
    body_html: post.body_html || '',
  };
}

function resolvePostFile(target) {
  const direct = path.resolve(process.cwd(), target);
  if (fs.existsSync(direct)) return direct;

  const bySlug = path.join(POSTS_DIR, `${target}.json`);
  if (fs.existsSync(bySlug)) return bySlug;

  fail(`Post file not found for ${target}`);
}

function listPostFiles() {
  if (!fs.existsSync(POSTS_DIR)) return [];
  return fs
    .readdirSync(POSTS_DIR)
    .filter((file) => file.endsWith('.json'))
    .map((file) => path.join(POSTS_DIR, file));
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function writeJson(file, value) {
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

function sha256(value) {
  return crypto.createHash('sha256').update(String(value), 'utf8').digest('hex');
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

main().catch((error) => fail(error.stack || error.message));
