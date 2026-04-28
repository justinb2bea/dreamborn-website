/**
 * GET /api/finn/visitor
 *
 * Classifies the current visitor to personalise the homepage hero subhead.
 * Uses Cloudflare request metadata (country, bot score, referer).
 * No external API calls — read-only classification.
 *
 * Output: { audience: 'business' | 'developer' | 'unknown', subhead: string | null }
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
  } else if (['US', 'GB', 'CA', 'AU', 'DE', 'SG'].includes(country) && botScore > 70) {
    // Enterprise signal: known business markets + likely-human bot score
    audience = 'business';
  }

  // Static subhead copy — Justin to supply final production strings.
  const SUBHEADS = {
    business:  '[CONTENT: Justin to supply copy for business audience]',
    developer: '[CONTENT: Justin to supply copy for developer audience]',
    unknown:   null, // null = retain server-rendered default subhead, no JS swap
  };

  return Response.json({
    audience,
    subhead: SUBHEADS[audience] ?? null,
  });
}
