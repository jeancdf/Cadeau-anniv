# Prompt: Redesign the Gift Finder UI (modern minimal)

Paste everything below into a fresh Claude Code conversation opened in this repo.

---

## Context

This is **Gift Finder**, a French-language Angular 17+ (standalone components) app for building and sharing gift wishlists, with AI-assisted suggestions. Two audiences use it:

1. **Visitors** — browse a public wishlist (`gift-list.component`) as a read-only grid of gift ideas, each with multiple price options and buy links.
2. **The list owner** (authenticated) — uses an "atelier" (studio) panel to add/edit gifts, bulk-import a raw text list via AI, and chat with an AI gift-planner (`gift-planner.component`) that runs an onboarding wizard (audience → occasion → start mode) then a chat workspace with a live draft-list sidebar.

Key files:
- `gift-list/src/styles.css` — global design tokens (CSS custom properties for light/dark themes: `--paper`, `--ink`, `--accent`, `--line`, etc.), global button styles, resets.
- `gift-list/src/app/app.component.html` / `.css` — site header (brand, "Nouvelle liste" button, theme toggle) + footer.
- `gift-list/src/app/gift-list/gift-list.component.html` / `.css` (~1477 lines) — hero, admin studio (gift form / import / AI suggestions tabs), search/filter bar, gift card grid, "find alternative link" and "cheaper alternatives" modals.
- `gift-list/src/app/gift-planner/gift-planner.component.html` / `.css` (~1124 lines) — onboarding wizard, chat workspace (message thread + composer), draft-list sidebar.
- `gift-list/src/app/modal/ai-suggestions/ai-suggestions.component.html` — an older Bootstrap-styled modal that's visually inconsistent with the rest (uses `.card`, `.btn`, `.modal-*` Bootstrap classes) — flag this as a candidate to restyle or replace.
- `gift-list/src/app/components/theme-toggle/`, `login-modal/`, `version-display/` — small standalone components.
- Icons: Bootstrap Icons (`bi bi-*`) via `@import 'bootstrap-icons/font/bootstrap-icons.css'` in `styles.css`. Font: Inter for body, Georgia/serif for a few editorial accents (brand name, footer tagline).

Current visual direction is a warm "editorial paper" look: cream/paper background, dark ink text, terracotta accent (`--accent: #d4573d`), sage green secondary, generous rounded pill buttons, serif touches. **We want to move away from this** — see Design Direction below.

## Design Direction: Modern Minimal

Replace the warm/crafted-paper aesthetic with a clean, modern-minimal product UI:
- Neutral base palette (white/near-white in light mode, true dark neutrals in dark mode) instead of cream/paper tones.
- One confident accent color used sparingly (buttons, active states, focus rings) instead of the current terracotta + sage dual-accent system.
- Sans-serif throughout — drop the Georgia/serif accents entirely.
- Tighter, more geometric shapes: prefer subtle rounded corners (6–12px) over the current pill-heavy (`border-radius: 999px`) button style, except where a pill genuinely fits (e.g. small tags/badges).
- Reduce decorative flourishes (the rotated brand mark, "note-tape" hero decoration, ambient blurred background blobs in the planner) in favor of whitespace, clear type hierarchy, and restrained shadows.
- Keep it approachable and warm in *tone* (French copy, friendly microcopy) even as the visual language becomes more minimal — this is a personal gift-list tool, not enterprise software.

## Hard constraints (must preserve)

- **Keep Angular standalone component structure** — edit the existing `.html`/`.css`/`.ts` files in place; don't introduce a new styling framework (no Tailwind, no Bootstrap component classes) unless you flag it as a proposal first. Bootstrap Icons (the icon font only) can stay.
- **Keep the CSS custom property architecture** in `styles.css` for theming — redefine the token *values* for the new palette, but keep the `:root`/`.light-theme` / `.dark-theme` class-based switching mechanism intact since `theme.service.ts` toggles those classes.
- **Keep all existing functionality, Angular bindings, `(click)` handlers, `*ngIf`/`*ngFor`, `formGroup`/`formControlName`, `cdkDropList`/`cdkDrag` (drag-to-reorder), and ARIA attributes** — this is a visual/CSS redesign, not a rewrite of component logic. If a template restructure is needed for the new layout, preserve every binding and keep accessibility (labels, `aria-*`, `role`) at least as good as today.
- **Keep French copy as-is** unless a specific string genuinely needs to change for the new layout (e.g. shortening a label to fit a new component) — call out any copy changes explicitly.
- **Keep responsive behavior** — the current CSS has mobile breakpoints (e.g. `@media (max-width: 620px)`, `940px`) for header, footer, and the planner's mobile draft-list toggle; the redesign must remain fully responsive, including the chat workspace collapsing to a single column with a toggleable list on small screens.
- Fix the visual inconsistency of `ai-suggestions.component.html` (still Bootstrap-modal styled) so it matches the rest of the app — restyle it or note it's now unused/dead code if superseded by the planner's inline AI panel (check `app.routes.ts` / usages before deleting).

## What to actually do

1. Propose the new token set first (colors for light + dark, spacing scale, radius scale, shadow scale, font stack) as a short summary before touching files, so it can be sanity-checked.
2. Update `gift-list/src/styles.css` tokens and shared primitives (`.button`, `.button--*`, spinners, focus rings).
3. Update `app.component.html`/`.css` (header/footer).
4. Update `gift-list.component.html`/`.css` (hero, studio tabs/forms, search/filters, gift card grid, both modals).
5. Update `gift-planner.component.html`/`.css` (onboarding wizard, chat thread, suggestion cards, draft-list sidebar).
6. Resolve `ai-suggestions.component` per the note above.
7. Run the app (`ng serve` in `gift-list/`) and check both light and dark themes, plus the mobile breakpoint, for each page/flow before reporting done.

## Deliverable

Actual edits to the files above (not a separate mockup) — this repo's Angular app should build (`ng build`) and run cleanly afterward with the new visual design applied everywhere, in both themes.
