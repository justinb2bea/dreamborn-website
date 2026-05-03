const JSON_HEADERS = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
};

export async function onRequestGet({ env }) {
  const SUPABASE_URL =
    env.DREAMBORN_OPERATING_SUPABASE_URL ||
    env.REDKEY_SUPABASE_URL ||
    env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY =
    env.DREAMBORN_OPERATING_SUPABASE_SERVICE_ROLE_KEY ||
    env.REDKEY_SUPABASE_SECRET_KEY ||
    env.REDKEY_SUPABASE_SERVICE_ROLE_KEY ||
    env.REDKEY_SUPABASE_KEY ||
    env.SUPABASE_SERVICE_ROLE_KEY ||
    env.SUPABASE_SERVICE_KEY;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return json({ ok: false, error: 'Service not configured' }, 503);
  }

  const clientId = env.DREAMBORN_PUBLIC_FEED_CLIENT_ID || env.PUBLIC_FEED_CLIENT_ID || '';
  const api = createSupabaseRest(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const [agents, definitions, tasks, inbox, events] = await Promise.all([
    readTable(api, 'agent_state', {
      select: '*',
      order: 'updated_at.desc',
      limit: '60',
      clientId,
    }),
    readTable(api, 'agent_definitions', {
      select: 'slug,name,roles,persona',
      order: 'slug.asc',
      limit: '80',
    }),
    readTable(api, 'agent_tasks', {
      select: '*',
      order: 'updated_at.desc.nullslast,created_at.desc',
      limit: '36',
      clientId,
    }),
    readTable(api, 'inbox', {
      select: '*',
      order: 'created_at.desc',
      limit: '24',
    }),
    readTable(api, 'cluster_events', {
      select: '*',
      order: 'created_at.desc',
      limit: '36',
    }),
  ]);

  const definitionRows = definitions.rows.map(normalizeDefinition).filter(Boolean);
  const definitionMap = new Map(definitionRows.map((definition) => [definition.id, definition]));
  const agentRows = agents.rows.map((row) => normalizeAgent(row, definitionMap)).filter(Boolean);
  const taskRows = tasks.rows.map(normalizeTask).filter(Boolean);
  const inboxRows = inbox.rows.map(normalizeInbox).filter(Boolean);
  const eventRows = events.rows.map(normalizeEvent).filter(Boolean);

  const feed = buildFeed(agentRows, taskRows, inboxRows, eventRows)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, 40);

  const cards = buildCards(taskRows, inboxRows, eventRows).slice(0, 12);
  const ledger = buildLedger(taskRows, inboxRows, eventRows).slice(0, 20);

  return json({
    ok: true,
    updated_at: new Date().toISOString(),
    source_status: {
      agent_state: agents.status,
      agent_definitions: definitions.status,
      agent_tasks: tasks.status,
      inbox: inbox.status,
      cluster_events: events.status,
    },
    system_state: summarizeAgents(agentRows),
    agents: agentRows.slice(0, 30),
    feed,
    cards,
    ledger,
  });
}

function createSupabaseRest(url, key) {
  const base = url.replace(/\/$/, '');
  const headers = {
    apikey: key,
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
  };

  return async function get(path, params) {
    const qs = new URLSearchParams(params);
    const res = await fetch(`${base}/rest/v1/${path}?${qs.toString()}`, { headers });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`${res.status}: ${body.slice(0, 180)}`);
    }
    return res.json();
  };
}

async function readTable(api, table, options) {
  const params = {
    select: options.select,
    order: options.order,
    limit: options.limit,
  };

  if (options.clientId) params.client_id = `eq.${options.clientId}`;

  try {
    const rows = await api(table, params);
    return { status: 'ok', rows: Array.isArray(rows) ? rows : [] };
  } catch (error) {
    if (options.clientId) {
      try {
        const rows = await api(table, {
          select: options.select,
          order: options.order,
          limit: options.limit,
        });
        return { status: 'ok_unfiltered', rows: Array.isArray(rows) ? rows : [] };
      } catch (fallbackError) {
        return { status: 'unavailable', rows: [], error: fallbackError.message };
      }
    }
    return { status: 'unavailable', rows: [], error: error.message };
  }
}

function normalizeAgent(row, definitions) {
  const slug = clean(row.agent || row.agent_id || row.name);
  if (!slug) return null;
  const definition = definitions.get(slug) || null;
  const status = clean(row.status) || 'idle';
  return {
    id: slug,
    name: titleCase(slug),
    role: clean(row.role || row.department || definition?.role_label || roleFor(slug)),
    roles: definition?.roles || [],
    persona: definition?.persona || personaFallback(slug),
    status,
    action: clean(row.action || row.last_action || row.current_action || row.task_id || ''),
    error: clean(row.last_error || row.error || ''),
    task_id: clean(row.task_id || ''),
    updated_at: clean(row.updated_at || row.created_at || ''),
  };
}

function normalizeDefinition(row) {
  const slug = clean(row.slug || row.agent || row.name).toLowerCase();
  if (!slug) return null;
  const roles = Array.isArray(row.roles) ? row.roles.map(clean).filter(Boolean) : [];
  return {
    id: slug,
    name: clean(row.name || titleCase(slug)),
    roles,
    role_label: roles.length ? roles.map(roleLabel).join(' / ') : roleFor(slug),
    persona: personaSummary(row.persona, slug, roles),
  };
}

function normalizeTask(row) {
  const id = clean(row.topic_id || row.id || row.task_id);
  if (!id) return null;
  const agent = clean(row.claimed_by || row.agent || row.assigned_to || row.owner_agent || '');
  const title = taskTitle(row);
  return {
    id,
    type: 'task',
    title,
    role: clean(row.role || row.type || ''),
    status: clean(row.status || ''),
    agent,
    verifier: clean(row.verified_by || row.reviewer || ''),
    output_ref: clean(row.output_ref || ''),
    cost: costLabel(row),
    created_at: clean(row.created_at || ''),
    updated_at: clean(row.updated_at || row.completed_at || row.created_at || ''),
    claimed_at: clean(row.claimed_at || ''),
    completed_at: clean(row.completed_at || ''),
    duration: durationLabel(row),
    preview: clean(row.summary || row.description || row.brief || row.output_summary || ''),
    raw: row,
  };
}

function normalizeInbox(row) {
  const id = clean(row.id);
  if (!id) return null;
  const payload = row.payload && typeof row.payload === 'object' ? row.payload : {};
  return {
    id,
    type: 'inbox',
    from: clean(row.from_agent || 'system'),
    to: clean(row.to_agent || ''),
    message_type: clean(row.message_type || ''),
    subject: clean(row.subject || payload.subject || ''),
    preview: clean(payload.summary || payload.message || payload.body || payload.content || payload.notes || ''),
    ref_id: clean(row.ref_id || ''),
    ref_type: clean(row.ref_type || ''),
    created_at: clean(row.created_at || ''),
    processed: Boolean(row.processed),
    processed_at: clean(row.processed_at || ''),
  };
}

function normalizeEvent(row) {
  const id = clean(row.id || row.topic_id || row.run_id);
  if (!id) return null;
  const topic = clean(row.topic_id || '');
  return {
    id,
    type: 'event',
    agent: clean(row.agent || row.agent_id || eventAgentFromTopic(topic)),
    topic_id: topic,
    run_id: clean(row.run_id || ''),
    status: clean(row.status || ''),
    message: clean(row.message_preview || row.message || row.event_type || ''),
    created_at: clean(row.created_at || ''),
  };
}

function buildFeed(agents, tasks, inbox, events) {
  const rows = [];

  tasks.forEach((task) => {
    const agent = task.agent || roleAgent(task.role) || 'system';
    const status = task.status || 'recorded';
    const action = taskAction(status);
    rows.push({
      id: `task-${task.id}`,
      card_id: `task-${task.id}`,
      timestamp: task.updated_at || task.created_at,
      agent: titleCase(agent),
      action,
      object: task.title,
      result: taskResult(task),
      kind: statusKind(status),
    });
  });

  inbox.forEach((message) => {
    rows.push({
      id: `inbox-${message.id}`,
      card_id: `inbox-${message.id}`,
      timestamp: message.created_at,
      agent: titleCase(message.from),
      action: message.processed ? 'resolved message' : 'sent message',
      object: message.subject || message.message_type || message.ref_id || 'inbox item',
      result: message.processed ? 'processed' : recipientLabel(message.to),
      kind: message.message_type.includes('blocked') || message.message_type.includes('reject') ? 'blocked' : 'message',
    });
  });

  events.filter(isPublicSignalEvent).forEach((event) => {
    rows.push({
      id: `event-${event.id}`,
      card_id: `event-${event.id}`,
      timestamp: event.created_at,
      agent: titleCase(event.agent || 'system'),
      action: event.status === 'error' ? 'rejected' : event.status === 'complete' ? 'completed' : 'recorded',
      object: event.message || event.topic_id || event.run_id || 'ledger event',
      result: event.status || 'logged',
      kind: event.status === 'error' ? 'blocked' : 'event',
    });
  });

  agents
    .filter((agent) => agent.updated_at && (agent.action || agent.error))
    .forEach((agent) => {
      rows.push({
        id: `agent-${agent.id}`,
        card_id: '',
        timestamp: agent.updated_at,
        agent: agent.name,
        action: agent.error ? 'reported issue' : stateAction(agent.status),
        object: agent.error || agent.action,
        result: agent.status,
        kind: agent.error || agent.status === 'blocked' ? 'blocked' : 'agent',
      });
    });

  return dedupeFeed(rows.filter((row) => row.timestamp));
}

function buildCards(tasks, inbox, events) {
  const taskCards = tasks.map((task) => ({
    id: `task-${task.id}`,
    kind: 'task',
    eyebrow: task.role || 'Task',
    title: cardTitle(task),
    status: publicStatus(task.status),
    status_kind: statusKind(task.status),
    meta: [
      ['Task ID', shortId(task.id)],
      ['Claimed by', titleCase(task.agent || 'unclaimed')],
      ['Verified by', titleCase(task.verifier || verifierFor(task.status))],
      ['Cost', task.cost || 'not recorded'],
      ['Duration', task.duration || 'not recorded'],
    ],
    preview: truncate(task.preview || task.output_ref || 'No public output preview recorded yet.', 320),
    full_output: task.output_ref
      ? `Output reference: ${task.output_ref}`
      : truncate(task.preview || '', 1200),
    timestamp: task.updated_at || task.created_at,
  }));

  const inboxCards = inbox.map((message) => ({
    id: `inbox-${message.id}`,
    kind: 'message',
    eyebrow: message.message_type || 'Inbox',
    title: `${titleCase(message.from)} sent ${message.subject || message.message_type || 'a message'}`,
    status: message.processed ? 'Processed' : 'Awaiting review',
    status_kind: message.processed ? 'verified' : 'pending',
    meta: [
      ['Message ID', shortId(message.id)],
      ['From', titleCase(message.from)],
      ['To', titleCase(message.to)],
      ['Reference', message.ref_id ? `${message.ref_type}:${shortId(message.ref_id)}` : 'none'],
    ],
    preview: truncate(message.preview || message.subject || 'No public message preview recorded.', 320),
    full_output: truncate(message.preview || '', 1200),
    timestamp: message.created_at,
  }));

  const eventCards = events.filter(isPublicSignalEvent).map((event) => ({
    id: `event-${event.id}`,
    kind: 'event',
    eyebrow: 'Ledger event',
    title: `${titleCase(event.agent || 'system')} recorded ${event.status || 'event'}`,
    status: publicStatus(event.status || 'logged'),
    status_kind: event.status === 'error' ? 'blocked' : 'verified',
    meta: [
      ['Event ID', shortId(event.id)],
      ['Topic', event.topic_id ? shortId(event.topic_id) : 'none'],
      ['Run', event.run_id ? shortId(event.run_id) : 'none'],
      ['Status', event.status || 'logged'],
    ],
    preview: truncate(event.message || 'Consensus event recorded.', 320),
    full_output: truncate(event.message || '', 1200),
    timestamp: event.created_at,
  }));

  const primaryTasks = taskCards
    .filter((card) => card.timestamp)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  const primaryInbox = inboxCards
    .filter((card) => card.timestamp)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  const secondary = eventCards
    .filter((card) => card.timestamp)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  return [...primaryTasks, ...primaryInbox, ...secondary];
}

function buildLedger(tasks, inbox, events) {
  return [
    ...tasks.map((task) => ({
      id: `ledger-task-${task.id}`,
      timestamp: task.updated_at || task.created_at,
      ref: shortId(task.id),
      actor: titleCase(task.agent || roleAgent(task.role) || 'system'),
      event: task.status || 'task',
      result: taskResult(task),
    })),
    ...inbox.map((message) => ({
      id: `ledger-inbox-${message.id}`,
      timestamp: message.created_at,
      ref: shortId(message.ref_id || message.id),
      actor: titleCase(message.from),
      event: message.message_type || 'message',
      result: message.processed ? 'processed' : recipientLabel(message.to),
    })),
    ...events.filter(isPublicSignalEvent).map((event) => ({
      id: `ledger-event-${event.id}`,
      timestamp: event.created_at,
      ref: shortId(event.topic_id || event.id),
      actor: titleCase(event.agent || 'system'),
      event: event.status || 'event',
      result: truncate(event.message || 'logged', 80),
    })),
  ]
    .filter((row) => row.timestamp)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}

function summarizeAgents(agents) {
  const working = agents.filter((a) => ['working', 'running', 'active'].includes(a.status)).length;
  const blocked = agents.filter((a) => ['blocked', 'error', 'failed'].includes(a.status)).length;
  const idle = agents.filter((a) => ['idle', 'waiting'].includes(a.status)).length;
  const awaiting = agents.filter((a) => /review|verify|approval|pending/i.test(`${a.action} ${a.status}`)).length;

  return {
    total: agents.length,
    working,
    idle,
    blocked,
    awaiting_verification: awaiting,
    label: `${working} working · ${idle} idle · ${awaiting} awaiting verification${blocked ? ` · ${blocked} blocked` : ''}`,
  };
}

function taskTitle(row) {
  const raw = clean(row.title || row.name || row.summary || '');
  if (raw) return truncate(raw, 120);
  const brief = clean(row.brief || row.description || '');
  if (brief) return truncate(brief.split('\n').find(Boolean) || brief, 120);
  return clean(row.type || row.role || 'work item');
}

function taskAction(status) {
  const s = status.toLowerCase();
  if (s.includes('claim') || s === 'in_progress' || s === 'working') return 'claimed';
  if (s.includes('review')) return 'sent for verification';
  if (s.includes('complete') || s.includes('done')) return 'completed';
  if (s.includes('block') || s.includes('fail') || s.includes('reject')) return 'rejected';
  if (s.includes('ready') || s.includes('created') || s.includes('queued') || s.includes('assigned')) return 'queued';
  return 'updated';
}

function taskResult(task) {
  const s = (task.status || '').toLowerCase();
  if (s.includes('complete') || s.includes('done')) return task.verifier ? `verified by ${titleCase(task.verifier)}` : 'complete';
  if (s.includes('block') || s.includes('fail') || s.includes('reject')) return 'returned to queue';
  if (s.includes('review')) return 'awaiting verification';
  if (s.includes('progress') || s.includes('claim') || s.includes('working')) return 'in progress';
  if (s.includes('queued') || s.includes('created') || s.includes('ready') || s.includes('assigned')) return task.role ? `${task.role} queue` : 'queued';
  return task.status || 'recorded';
}

function cardTitle(task) {
  const agent = titleCase(task.agent || roleAgent(task.role) || 'system');
  const action = taskAction(task.status);
  return `${agent} ${action} ${task.title}`;
}

function publicStatus(status) {
  const s = (status || '').toLowerCase();
  if (s.includes('complete') || s.includes('approved') || s.includes('done')) return 'Verified';
  if (s.includes('block') || s.includes('reject') || s.includes('fail')) return 'Returned to queue';
  if (s.includes('review')) return 'In review';
  if (s.includes('progress') || s.includes('working') || s.includes('claim')) return 'In progress';
  if (s.includes('queued') || s.includes('ready') || s.includes('created') || s.includes('assigned')) return 'Queued';
  return status ? titleCase(status) : 'Recorded';
}

function statusKind(status) {
  const s = (status || '').toLowerCase();
  if (s.includes('complete') || s.includes('approved') || s.includes('done')) return 'verified';
  if (s.includes('block') || s.includes('reject') || s.includes('fail') || s.includes('error')) return 'blocked';
  if (s.includes('review') || s.includes('pending')) return 'pending';
  if (s.includes('progress') || s.includes('working') || s.includes('claim')) return 'active';
  return 'queued';
}

function durationLabel(row) {
  const explicit = row.duration || row.duration_seconds;
  if (typeof explicit === 'number') return secondsLabel(explicit);
  if (typeof explicit === 'string' && explicit.trim()) return explicit.trim();
  const started = row.claimed_at || row.started_at || row.created_at;
  const ended = row.completed_at || row.updated_at;
  if (!started || !ended) return '';
  const diff = Math.max(0, Math.floor((new Date(ended) - new Date(started)) / 1000));
  return diff ? secondsLabel(diff) : '';
}

function costLabel(row) {
  const candidates = [
    row.cost_usd,
    row.total_cost_usd,
    row.estimated_cost_usd,
    row.cost,
  ];
  const value = candidates.find((item) => item !== null && item !== undefined && item !== '');
  if (value === null || value === undefined || value === '') return '';
  const numeric = Number(value);
  if (!Number.isNaN(numeric)) {
    if (numeric === 0) return '$0.00';
    if (numeric < 0.01) return `<$0.01`;
    return `$${numeric.toFixed(2)}`;
  }
  return clean(value);
}

function secondsLabel(total) {
  if (total < 60) return `${total}s`;
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}m ${seconds}s`;
}

function verifierFor(status) {
  const s = (status || '').toLowerCase();
  if (s.includes('complete') || s.includes('review') || s.includes('approved')) return 'Atlas';
  return 'pending';
}

function roleAgent(role) {
  const map = {
    developer: 'quinn',
    reviewer: 'atlas',
    architect: 'atlas',
    ba: 'priya',
    pm: 'mindy',
    ux: 'zara',
    qa: 'luna',
    'marketing-strategy': 'nova',
    'content-writer': 'harper',
    social: 'jade',
    graphic: 'rosa',
    publisher: 'ivy',
    sales: 'brooke',
    bdr: 'traci',
    crm: 'arlo',
    coordinator: 'claire',
    orchestrator: 'claire',
  };
  return map[(role || '').toLowerCase()] || '';
}

function roleFor(agent) {
  const map = {
    quinn: 'Developer',
    quinn2: 'Developer',
    nova: 'Marketing',
    finn: 'Inbound',
    atlas: 'Architecture',
    rosa: 'Visual production',
    ivy: 'Publishing',
    harper: 'Content',
    jade: 'Social',
    claire: 'Orchestration',
    mindy: 'Project management',
    luna: 'QA',
    zara: 'UX',
    arlo: 'CRM',
    priya: 'Business analysis',
    vikram: 'Architecture',
    'atlas codex': 'Architecture',
    'atlas-codex': 'Architecture',
  };
  return map[(agent || '').toLowerCase()] || 'Agent';
}

function roleLabel(role) {
  const map = {
    ba: 'Business analysis',
    bdr: 'BDR',
    crm: 'CRM',
    developer: 'Developer',
    architect: 'Architecture',
    reviewer: 'Reviewer',
    coordinator: 'Coordinator',
    engine: 'Engine',
    exec: 'Exec',
    graphic: 'Visual production',
    'content-writer': 'Content',
    'marketing-strategy': 'Marketing',
    planner: 'Planning',
    publisher: 'Publishing',
    qa: 'QA',
    sales: 'Sales',
    social: 'Social',
    supervisor: 'Project management',
    ux: 'UX',
  };
  return map[(role || '').toLowerCase()] || titleCase(role);
}

function personaSummary(persona, slug, roles) {
  const raw = typeof persona === 'string' ? persona : '';
  if (!raw.trim()) return personaFallback(slug);
  const publicText = raw
    .replace(/```[\s\S]*?```/g, '')
    .replace(/##\s*(Environment|First Action|Scope Exclusions|Inbox Protocol|Done When|Blocked When)[\s\S]*?(?=\n##\s|\n#\s|$)/gi, '')
    .replace(/###\s*(Receiving|Sending)[\s\S]*?(?=\n###\s|\n##\s|$)/gi, '');

  const paragraphs = publicText
    .replace(/```[\s\S]*?```/g, '')
    .split(/\n{2,}|\\n\\n/)
    .map((part) => clean(part.replace(/^#+\s*/g, '')))
    .filter((part) => part && !/sudo|vps|\/opt\/redk3y|upload_output|service-role|secret|token/i.test(part));

  const first = paragraphs.find((part) => /^you are/i.test(part)) || paragraphs[0] || '';
  const second = paragraphs.find((part) => /what you do|job|claim|write|review|route|plan|publish|verify|execute/i.test(part) && part !== first) || '';
  const summary = [first, second].filter(Boolean).join(' ');
  if (summary) return truncate(summary, 460);

  const roleText = roles.length ? roles.map(roleLabel).join(' / ') : roleFor(slug);
  return `${titleCase(slug)} operates as ${roleText}.`;
}

function personaFallback(slug) {
  const map = {
    quinn: 'Quinn is the developer. He claims implementation work, edits the product, uploads concrete output, and stops when the task is complete.',
    quinn2: 'Quinn2 is a developer runner. He claims implementation work, produces the requested artifact or patch, and reports completion back through the task system.',
    atlas: 'Atlas is the architecture and verification layer. Nothing important moves forward until the work is checked against the system shape.',
    'atlas-codex': 'Atlas-Codex is the architecture and implementation partner for complex build sessions, combining code work with durable memory and operating discipline.',
    nova: 'Nova plans marketing work and turns company truth into campaigns, queues, and channel strategy.',
    finn: 'Finn handles inbound understanding, answers questions, and routes interest into the company.',
    rosa: 'Rosa creates visual production outputs and prepares assets for review.',
    ivy: 'Ivy owns publishing gates and makes sure approved work reaches the right surface.',
  };
  return map[(slug || '').toLowerCase()] || `${titleCase(slug)} is an active Dreamborn agent with a defined operating role in the company.`;
}

function eventAgentFromTopic(topic) {
  const text = clean(topic);
  if (text && !/^0\.0\.\d+$/.test(text)) return text;
  return 'system';
}

function isPublicSignalEvent(event) {
  const message = `${event.message} ${event.status}`.toLowerCase();
  if (!message.trim()) return false;
  if (/cancelled=0\s+redispatched=0\s+escalated=0/.test(message)) return false;
  if (/^complete$/.test(message.trim())) return false;
  return true;
}

function dedupeFeed(rows) {
  const seen = new Map();
  const result = [];
  for (const row of rows.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))) {
    const key = `${row.agent}|${row.action}|${row.object}|${row.result}`.toLowerCase();
    const count = seen.get(key) || 0;
    if (count >= 2) continue;
    seen.set(key, count + 1);
    result.push(row);
  }
  return result;
}

function recipientLabel(to) {
  if (!to) return 'message sent';
  return to === 'justin' ? 'human inbox' : `${titleCase(to)} inbox`;
}

function stateAction(status) {
  const s = (status || '').toLowerCase();
  if (['working', 'running', 'active'].includes(s)) return 'working on';
  if (s === 'blocked' || s === 'error') return 'blocked on';
  return 'reported';
}

function shortId(value) {
  const text = clean(value);
  if (!text) return 'none';
  if (text.length <= 14) return text;
  return `${text.slice(0, 7)}…${text.slice(-4)}`;
}

function clean(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') return '';
  return String(value).replace(/\s+/g, ' ').trim();
}

function truncate(value, length) {
  const text = clean(value);
  if (text.length <= length) return text;
  return `${text.slice(0, length - 1).trim()}…`;
}

function titleCase(value) {
  return clean(value)
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function json(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: JSON_HEADERS,
  });
}
