#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const MarkdownIt = require('markdown-it');

const md = new MarkdownIt({ html: true, linkify: true, typographer: true });

async function main() {
  const inputPath = process.argv[2];
  if (!inputPath) {
    fail('Usage: npm run publish:thinking -- path/to/post.md');
  }

  const absolutePath = path.resolve(process.cwd(), inputPath);
  const raw = fs.readFileSync(absolutePath, 'utf8');
  const { data, content } = parseFrontmatter(raw);
  const title = required(data.title, 'title');
  const slug = data.slug || slugify(title);
  const publishedAt = data.published_at || new Date().toISOString();
  const status = data.status || 'published';
  const topicSlugs = normalizeList(data.topics || data.topic_ids || 'dispatches');

  const bodyHtml = data.body_html || md.render(content.trim());
  const excerpt = data.excerpt || makeExcerpt(content);

  const payload = {
    id: data.id || `generated-${slug}`,
    title,
    title_html: data.title_html || title,
    card_title_html: data.card_title_html || data.title_html || title,
    slug,
    body_html: bodyHtml,
    body_md: content.trim(),
    excerpt,
    type: data.type || 'article',
    status,
    topic_ids: topicSlugs,
    topic_label: data.topic_label || titleCase(topicSlugs[0] || 'article'),
    author: data.author || 'Dreamborn',
    scheduled_date: data.scheduled_date || null,
    published_at: status === 'published' ? publishedAt : null,
    featured_image_url: data.featured_image_url || null,
    no_chrome: parseBoolean(data.no_chrome),
  };

  const result = writeLocalPost(payload);

  console.log(JSON.stringify({
    id: result.id,
    status: result.status,
    slug: result.slug,
    url: `https://dreamborn.ai/thinking/${result.slug}/`,
    file: result.file,
  }, null, 2));
}

function parseFrontmatter(raw) {
  if (!raw.startsWith('---\n')) return { data: {}, content: raw };
  const end = raw.indexOf('\n---', 4);
  if (end === -1) return { data: {}, content: raw };
  const frontmatter = raw.slice(4, end).trim();
  const content = raw.slice(end + 4).trim();
  const data = {};

  frontmatter.split('\n').forEach((line) => {
    const match = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!match) return;
    const key = match[1];
    const value = match[2].trim();
    data[key] = parseValue(value);
  });

  return { data, content };
}

function parseValue(value) {
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }
  if (value.startsWith('[') && value.endsWith(']')) {
    return value.slice(1, -1).split(',').map((item) => parseValue(item.trim())).filter(Boolean);
  }
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (value === 'null') return null;
  return value;
}

function required(value, label) {
  if (!value) fail(`Missing required frontmatter field: ${label}`);
  return value;
}

function normalizeList(value) {
  if (Array.isArray(value)) return value;
  return String(value).split(',').map((item) => item.trim()).filter(Boolean);
}

function parseBoolean(value) {
  return value === true || value === 'true';
}

function slugify(value) {
  return String(value)
    .toLowerCase()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function makeExcerpt(content) {
  return content
    .replace(/<[^>]+>/g, ' ')
    .replace(/[#*_`>\[\]()]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 220);
}

function titleCase(value) {
  return String(value)
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function writeLocalPost(payload) {
  const outputDir = path.join(process.cwd(), 'src', '_data', 'generated_posts');
  fs.mkdirSync(outputDir, { recursive: true });
  const file = path.join(outputDir, `${payload.slug}.json`);
  fs.writeFileSync(file, `${JSON.stringify(payload, null, 2)}\n`);
  return { ...payload, file: path.relative(process.cwd(), file) };
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

main().catch((error) => fail(error.stack || error.message));
