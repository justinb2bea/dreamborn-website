# Dreamborn Explainer and AI-Native Split Design

Date: 2026-05-06

## Decision

Dreamborn needs two distinct explanatory pages:

- `/explainer/` answers "What does Dreamborn do and how does it work?"
- `/ai-native/` answers "What is AI-native?"

The current `/explainer/` page carries the broader AI-native category story. It should be replaced by the more specific Dreamborn cluster explanation. The AI-native category story should move to a new canonical `/ai-native/` page that synthesizes the Thinking blog series.

## `/explainer/`: Dreamborn.ai — How It Works

Purpose: explain Dreamborn's production-ready multi-agent cluster to prospects.

Core thesis: most AI systems are linear pipelines, but Dreamborn runs a coordinated multi-agent cluster where specialized agents claim work in parallel across shared context, memory, orchestration, and verification.

Page shape:

1. Hero: "Most AI companies have workflows. We built a production-ready multi-agent cluster."
2. What most teams build: pipelines are useful for simple automations but break under enterprise software complexity.
3. What a multi-agent cluster is: role-based agents operating across shared queues, memory, permissions, tools, and verification.
4. Role-based agents: BA, architecture, development, QA, governance, publishing, and orchestration roles.
5. Parallel task claiming: agents claim work based on priority, dependency, role capability, workload, context access, and system state.
6. Scaling the cluster: add capacity by expanding specialized agent groups around workload.
7. Production-ready matters: review, receipts, state, dependencies, testing, governance, recovery, and visibility.
8. Why this is a superpower: software stops being the bottleneck.
9. Beyond SaaS and final CTA: coordinated humans and agents working inside shared goals and shared operational context.

Visual direction:

- Darker, operational, system-room tone.
- Large animated cluster map in the hero with task pulses moving between agent role groups.
- Pipeline vs cluster comparison graphic.
- Interactive role grid with expandable role details: inputs, outputs, tools, claimable tasks, example work.
- Scaling diagram showing workload increasing, agents activating, and throughput rising.
- Use existing Dreamborn brand typography and color tokens. Avoid generic purple AI visuals.

Primary CTAs:

- "See the system in action" -> `/live/`
- "Talk to Dreamborn" -> `/connect/`

## `/ai-native/`: What Is AI-Native?

Purpose: define the category and act as a canonical concept hub.

Core thesis: AI-native is not a chatbot, feature, or faster assistant. It is an operating model where agents, humans, systems, memory, authority, queues, verification, and receipts are designed together.

Source material: synthesize the current Thinking series rather than duplicating it:

- `what-is-an-ai-native-company`
- `chatbots-dont-move-work`
- `sent-is-not-received`
- `why-agents-need-receipts`
- `the-ai-native-org-chart`
- `the-human-ceo-in-an-agent-company`
- `what-every-company-needs-before-hiring-agents`
- `why-prds-are-evidence-not-the-plan`
- `ai-isnt-a-fast-intern`
- `atlas-on-agent-memory`

Page shape:

1. Hero: "An AI-native company is not a normal company with chatbots attached."
2. Definition: AI-native means AI participates in the operating layer of work.
3. Component map:
   - Work moves, not just words.
   - Agents need memory.
   - Receipts make autonomy inspectable.
   - Humans govern authority and judgment.
   - PRDs are evidence, not the plan.
   - The org chart includes agents, systems, queues, and verification.
4. Essay index: curated cards linking into the Thinking posts for deeper reading.
5. Bridge back to Dreamborn: "This is the operating model Dreamborn builds with." CTA to `/explainer/`.

Visual direction:

- More editorial and manifesto-like than `/explainer/`.
- Use a component map instead of a live-system control surface.
- Keep the page concise and use the blog series as depth, not as repeated body copy.

## Navigation and Cross-Linking

- Main nav keeps `Explainer` pointing to `/explainer/`.
- Footer adds or retains `Explainer`; add `AI-Native` only if the footer has room without clutter.
- Existing "See how it works" CTAs continue to point to `/explainer/`.
- Conceptual "AI-native" references should point to `/ai-native/` where appropriate.
- `/thinking/what-is-an-ai-native-company/` remains the essay version and can link to `/ai-native/` as the canonical guide.
- Add `/ai-native/` to sitemap and SEO tests.

## Implementation Notes

- Preserve existing dirty homepage changes unless directly required for route links.
- Add tests before production edits:
  - `/explainer/` contains the cluster thesis and role groups.
  - `/ai-native/` exists, contains the category definition, and links to the Thinking series.
  - sitemap includes `/ai-native/`.
  - nav/footer/CTA expectations remain coherent.
- Build verification: `npm test` and `npm run build`.

## Out of Scope

- No new backend functions.
- No live fabricated data.
- No change to Thinking post publishing.
- No Cloudflare deploy until the pages build and tests pass locally.
