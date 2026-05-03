/**
 * GET /api/finn/visitor
 * Classifies the current visitor to personalise the homepage hero subhead.
 * Uses Cloudflare request metadata (country, bot score, referer).
 * No external API calls at v1 — static classification only.
 */
export async function onRequestGet({ request }) {
  const cf       = request.cf || {};
  const country  = cf.country || null;
  const botScore = cf.botManagement?.score ?? 100; // 0 = definitely bot, 100 = human
  const referer  = request.headers.get('Referer') || '';

  // Bot detection: score < 30 = likely bot → treat as unknown
  if (botScore < 30) {
    return Response.json({ audience: 'unknown', subhead: null });
  }

  let audience = 'unknown';

  // Developer signal: referer from GitHub, Hacker News, or dev-adjacent domains
  const DEV_REFERERS = ['github.com', 'news.ycombinator.com', 'lobste.rs', 'dev.to'];
  if (DEV_REFERERS.some(d => referer.includes(d))) {
    audience = 'developer';
  }
  // Enterprise/business signal: high-confidence bot score + known B2B market
  else if (['US', 'GB', 'CA', 'AU', 'DE', 'SG'].includes(country) && botScore > 70) {
    audience = 'business'; // default for known markets
  }

  // Subhead copy per audience.
  // TODO: Justin to supply final business/developer/enterprise copy.
  // These are placeholder strings. Client-side finn-visitor.js also has fallbacks.
  const SUBHEADS = {
    business:   null, // null = client uses its own placeholder or default
    developer:  null,
    enterprise: null,
    unknown:    null, // null = use server-rendered default subhead, no swap
  };

  return Response.json({
    audience,
    subhead: SUBHEADS[audience] ?? null,
  });
}
