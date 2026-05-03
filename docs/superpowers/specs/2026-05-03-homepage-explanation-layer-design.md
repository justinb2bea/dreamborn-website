# Dreamborn Homepage Explanation Layer Design

Date: 2026-05-03
Status: Approved for implementation planning

## Context

Dreamborn's homepage currently works as a public operating surface. It shows live company activity, agent work, receipts, and the claim that Dreamborn is an AI-native company in production.

The risk is comprehension. A first-time visitor may be interested but still ask, "What am I looking at?" The answer should not replace the homepage with a conventional explainer page. The page should keep its operating-room feel and transform in place when the visitor asks for help understanding it.

The reference Stitch translation page is useful for plain-language framing, but its standalone explainer structure should not replace Dreamborn's current style.

## Goal

Add a homepage explanation mode that:

- Lets the visitor click `What am I looking at?`.
- Transforms the homepage copy and labels in place.
- Keeps the live operating surface visible.
- Opens or foregrounds Finn with a seeded explanation prompt.
- Establishes Finn as the site-wide interpreter for Dreamborn, not only a `/connect/` chat.

The intended feeling is: the site says, "Alright. Here's what you're looking at," then walks the visitor through the live system without dumbing it down.

## Non-Goals

- Do not create a separate translated homepage.
- Do not remove the live feed, receipts, ledger, or agent roster from the homepage.
- Do not turn the feature into a generic "Translate" control.
- Do not use generic SaaS comparison cards, checkmark grids, or stock AI imagery.
- Do not make Finn the only explanation mechanism. The page itself must visibly transform.

## User-Facing Behavior

The homepage hero keeps two primary actions:

- `Watch the work move`
- `What am I looking at?`

Clicking `What am I looking at?` activates explanation mode.

In explanation mode:

- The page should visibly change without a full reload.
- The hero kicker changes to `Alright. Here's what you're looking at.`
- The hero headline shifts from provocation to definition.
- The hero subhead explains Dreamborn in plain English.
- Proof stat labels gain context while preserving the original facts.
- Section headings and intros become clearer.
- Finn opens as a compact drawer or panel with the seeded prompt ready to send: `Explain what I'm looking at on the Dreamborn homepage.`

The visitor should be able to return to the original operating-surface copy. The control label for that reverse action should be direct, such as `Show the operating surface`.

## Interpreter Control Placement

The `What am I looking at?` action should behave like a recurring interpreter control, not a one-off hero CTA. The goal is to make the escape hatch available exactly where confusion happens while avoiding button spam.

Required placements:

- Hero primary action: a prominent `What am I looking at?` button next to `Watch the work move`.
- Sticky page launcher: a compact persistent control on the homepage, visible after the hero begins to scroll away.
- Section-level prompts: one compact interpreter action in each major homepage section.
- Finn drawer launcher: a site-wide fallback for conversational explanation.

The control hierarchy should be:

- Hero button: page-level transformation.
- Sticky launcher: page-level transformation or return to operating-surface mode.
- Section prompt: contextual Finn explanation for that section, and optionally section-scoped visual emphasis.
- Finn launcher: general site-wide interpreter.

Section-level labels should be specific instead of repeating the same phrase everywhere:

- Live feed / proof area: `Explain this feed`
- Work section: `What work is happening here?`
- Ledger section: `Explain the proof`
- Agent section: `Who are these agents?`
- Dispatch section: `Translate this`

When explanation mode is off, section prompts should invite translation. When explanation mode is on, they should shift toward follow-up help, such as `Ask Finn about this section`.

The repeated controls must share one state model. Clicking any page-level explanation control should activate the same homepage explanation mode. Clicking the reverse label should restore the operating surface everywhere.

The page should not show more than one prominent explanation CTA in the same viewport unless one is the sticky control and one is contextual to a section. The hero CTA can be visually loud; section controls should be compact, integrated into section headers, and secondary.

## Homepage Copy Model

Default mode should remain close to the current positioning:

- Kicker: `AI-native company / public operating surface`
- Headline: `What's your AI strategy? This is ours.`
- Subhead: `Dreamborn is an AI-native company. Humans set direction. Agents take the work. Nothing moves forward until it's verified.`

Explanation mode should use plain English:

- Kicker: `Alright. Here's what you're looking at.`
- Headline: `A company operating through AI agents.`
- Subhead: `Dreamborn builds real software with agent teams instead of a traditional payroll. The panels on this page are the receipts: work claimed, completed, verified, and handed off.`

Proof stat translation:

- `Payroll` / `$176.45 / mo` becomes `Operating payroll` / `$176.45 / mo` with supporting context: `What the agent workforce costs to run.`
- `Active agents total` / `24` becomes `AI roles doing company work` / `24`.
- `Active right now` / `5` becomes `Agents working right now` / `5`.
- `Workflows` / `live` becomes `Work moving now` / `live`.

Section translation:

- `This is not a demo` becomes `What work is being done`.
- `Receipts of work` becomes `Live records from the company`.
- `The read receipt for work` becomes `How we prove work was received`.
- `Meet the company` becomes `The AI team behind the company`.
- `Roles being filled` becomes `Who does the work`.
- `Dispatches` becomes `Founder notes`.

These are implementation copy targets, not immutable final copy. The important constraint is that explanation mode is concise, concrete, and still recognizably Dreamborn.

## Finn Everywhere

Finn should become a reusable site-level interpreter rather than a chat that only lives on `/connect/`.

Required behavior:

- A persistent Finn launcher should be available across the site chrome.
- The homepage explanation CTA should be able to open Finn with a page-aware starter prompt.
- Other pages should be able to invoke Finn with page-specific explanation prompts, such as `Explain this Work page` or `Explain the System page`.
- Finn should receive the current `page_path`, referrer, session id, and source prompt, preserving the analytics behavior already present in `finn-chat.js`.

The implementation can reuse the existing `/api/finn/chat` endpoint and session id strategy. The design requires extracting or adapting the current `/connect/` chat UI into a reusable component, drawer, or launcher.

## Interaction Model

The explanation mode should be stateful on the client:

- Default state: original operating-surface copy.
- Explanation state: plain-English copy and contextual notes.
- Finn state: closed, launcher visible, or drawer open.

Suggested sequence:

1. Visitor lands on homepage.
2. Visitor clicks `What am I looking at?`.
3. The hero copy and section labels transition in place.
4. A short line appears: `Alright. Here's what you're looking at.`
5. Finn opens as a compact drawer or panel with the seeded prompt ready to send.
6. Visitor can ask follow-up questions without leaving the page.

Transitions should be quick and restrained: opacity, text swap, and subtle panel reveal. Avoid theatrical animations that delay comprehension.

## Visual Direction

Use the existing Dreamborn forge/brand register:

- Dark warm background.
- Crimson, lime, amber, taupe, and warm neutral accents.
- Mono labels for operational state.
- Editorial warmth only for short explanatory notes.
- Compact cards and 1px borders.

The explanation layer should feel like an operational annotation system, not a consumer onboarding wizard.

Acceptable visual elements:

- Inline context rows under proof stats.
- Small `Plain English` or `This means` notes.
- A compact Finn drawer or launcher.
- A temporary top-line acknowledgement after activation.
- A subtle sticky interpreter rail or bottom mobile pill.
- Compact section-header interpreter chips with section-specific prompt text.

Avoid:

- Blue/purple AI gradients.
- Stock AI imagery.
- Red X / green check SaaS comparison grids.
- Oversized tutorial cards.
- Long explanatory paragraphs in the hero.
- Repeating the full `What am I looking at?` label in every section.
- Letting sticky controls cover live feed cards, buttons, or Finn input on mobile.

## Accessibility and Resilience

- The CTA must be a real button, not only a link.
- Explanation mode changes should update visible text and should not require hover.
- Finn should remain usable with keyboard navigation.
- If Finn is unavailable, the page explanation mode should still work.
- If JavaScript fails, the default homepage should remain usable and links to `/connect/` should still work.
- The current live feed failure honesty must remain intact. Do not invent work or explanatory data.

## Analytics

Track these events if the existing analytics path supports it:

- Explanation mode activated.
- Explanation mode dismissed.
- Finn opened from homepage explanation mode.
- Finn opened from other pages.
- Starter prompt used.

The implementation should preserve the existing Finn transcript metadata: session id, page path, referrer, and source prompt.

## Implementation Boundaries

Expected files likely include:

- `src/index.njk` for homepage controls and copy hooks.
- `public/css/main.css` for explanation state and Finn launcher/drawer styling.
- `public/js/operating-surface.js` or a new small homepage script for explanation mode state.
- `public/js/finn-chat.js` or a new reusable Finn script for site-wide drawer behavior.
- `src/_layouts/base.njk` or shared includes for the persistent Finn launcher.

The implementation should avoid a large rewrite of the homepage operating surface. It should layer explanation behavior onto the existing structure.

## External Feedback Incorporated

Gemini feedback supported the main direction:

- Keep the current live proof and operating-surface feel.
- Make the above-fold subhead more definitional.
- Avoid generic `About Us` or conventional explainer patterns.
- Annotate or transform the existing UI rather than replacing it.
- Avoid stock AI visuals, checkmark grids, and generic SaaS framing.

Claude CLI feedback could not be collected locally because authentication failed with invalid credentials. This is not a blocker for the design.

## Open Implementation Questions

- Should Finn auto-submit the starter prompt immediately, or open with the starter prompt ready for the visitor to send?
- Should explanation mode persist for the browser session, or reset on reload?
- Should the site-wide Finn drawer ship in the same implementation pass as the homepage transform, or as a follow-up if scope grows?

Recommended defaults:

- Open Finn with the starter prompt visible and one-click send, rather than auto-submitting. This avoids surprising visitors.
- Persist explanation mode only for the current page session, not across reloads.
- Ship homepage transform and reusable Finn launcher together if feasible, because the concept depends on both.
