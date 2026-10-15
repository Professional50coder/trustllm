# Design notes

Patterns studied on 2026-10-16 from two public product sites, in a browser, read-only: no sign-up, log-in, payment or personal data entered. Only structure and interaction patterns are recorded. No text, branding, illustration, asset or code was copied; TrustLLM has its own name, palette, type pairing and copy.

## What was studied

| Site | Reached | Stopped at |
|---|---|---|
| navige.ai (a Product Hunt-listed product) | Landing page top to bottom, Pricing page. The `/docs` path returned a 404 page. | Sign In and Get Started (account creation), so the product itself was not used. |
| proposify.com | Landing page top to bottom (cookie banner left untouched). | Free trial and demo booking (account / personal data). |

## Landing page structure observed (section order)

1. **Floating or sticky top bar**: logo left, 3-4 text links centre, secondary "sign in" and a filled primary button right. One primary action, repeated.
2. **Hero**: outcome headline in large type, one phrase set in an italic serif accent (navige) or a plain benefit headline (proposify); one-sentence support line; primary and secondary buttons; a small third-party badge (navige's launch badge) or a "see how it works in 3 minutes" video.
3. **Product visual directly under the hero**: a framed product image or video, so the offer is understood without scrolling.
4. **Proof strip**: three big numbers or a logo row. Both sites rely on claims we cannot verify for ourselves, so TrustLLM uses only checkable facts (measured numbers, licence, test counts, supported providers).
5. **Problem, then contrast**: a diagram or "everyone else does X / we do Y" pair of colour cards.
6. **Numbered feature list on a tinted band** (navige: four items with a visual that changes per item), or **alternating text and product visual rows** (proposify), each ending in a "Try" link.
7. **Integrations / "sits in between"** diagram.
8. **Testimonials** (proposify) or **pricing explained with a worked example** (navige: "free forever" tier plus the one condition under which you pay).
9. **FAQ** as an accordion with numbered questions that answer the real objections (does it change my output, do I rewrite code, what happens to my data, what if it saves nothing).
10. **Final CTA band** repeating the primary action, then a four-column footer (product, pricing, resources, company) and legal links.

## Component and style patterns worth keeping

- Generous vertical rhythm (roughly 96-128 px between sections), one idea per section, short headlines.
- Mixed type: a clean grotesque for headlines plus an italic serif for one emphasised word. Used sparingly it gives a distinct voice.
- Cards with a large radius (16-24 px), soft layered shadows, and a framed "window" around product visuals.
- Colour used as a system: one tinted band per page for contrast, gradient cards for the key comparison, neutral everywhere else.
- Honest pricing page pattern: lead with what is free, state exactly when money changes hands, show a worked example, then FAQ.
- Subtle motion: fade and rise on entry, a progress bar on the active numbered item. Both respect reduced-motion preferences when implemented well.
- Cookie and chat widgets overlap content on first load (proposify). Avoid: TrustLLM has no cookies, no banner and no chat widget.

## Onboarding and product-flow patterns

- Free tier with no card, a clear statement that it is not a trial (navige). TrustLLM equivalent: demo mode with zero setup, live mode with your own key, MIT code.
- Setup claimed as one line of configuration (navige). TrustLLM equivalent: `node dist/cli.cjs init`, or "Download trustllm.yaml" from the app.
- Empty and loading states: could not be observed without an account. TrustLLM designs its own (first-run guide card, "No results yet" panel, in-button spinner, inline error banners).

## How this was applied to TrustLLM

| Pattern | TrustLLM implementation |
|---|---|
| Sticky nav with one primary CTA | `components/site-nav.tsx` |
| Outcome headline with italic serif accent | Hero on `/`, Instrument Serif accent word |
| Product visual under the hero | The real report cards, rendered by the actual engine at build time, inside a browser-window frame |
| Verifiable proof strip | Measured agreement numbers, test count, licence, providers: all linked to the repo docs |
| "Everyone else / us" contrast cards | "Dashboards tell you after release / TrustLLM decides before" |
| Numbered features on a tinted band | Four numbered capabilities with a visual per item |
| Alternating text and visual rows | Rules, report, CLI terminal |
| Worked-example pricing | "Free, MIT; you only pay your model provider" card |
| Numbered FAQ accordion | Questions about keys, accuracy, data, alternatives |
| Final CTA, four-column footer | Same structure, own copy |
| App shell | Sidebar plus top bar for Evaluate, Guardrails, History; marketing shell for Home and Docs |
| Design tokens | CSS variables in `app/globals.css`: palette, radius, shadows, light and dark |
