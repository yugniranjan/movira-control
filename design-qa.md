# Movira Control design QA

## 2026-10-08 — Dark-mode readability and persistent header

### Scope

- Routes checked: `/movira-control/parks`, `/movira-control/plans`
- View checked: compact/mobile browser width
- Theme checked: dark

### Before

- Violet labels and active controls inherited `#480D9A`, which had insufficient contrast on the dark application surfaces.
- Legacy green, amber, and red Tailwind status utilities retained light-theme foreground/background combinations.
- The header used `position: sticky` inside an ancestor with horizontal overflow clipping, so it was not reliable across all layouts.

### Changes

- Added dark-mode admin shell, heading, muted text, border, popover, and high-contrast accent tokens.
- Added accessible dark semantic colors for violet, success, warning, and error utilities while preserving their meaning.
- Kept the deep Movira purple for button depth/shadows and introduced a separate light violet foreground for dark surfaces.
- Converted the Control header to a fixed 56px header and added matching layout spacing.
- Replaced `overflow-x-hidden` with `overflow-x-clip` on the shell to avoid creating an accidental scroll container.

### Verification

- Header remains at viewport top after scrolling (`position: fixed`, top `0`).
- Main content begins below the 56px header.
- Dark violet foreground resolves to `rgb(196, 181, 253)`.
- Dark success foreground resolves to `rgb(110, 231, 183)`.
- Dark error foreground resolves to `rgb(252, 165, 165)`.
- `npm run lint`: passed.
- `npm run build`: passed.

### Remaining issues

- None observed in the requested scope.

## 2026-10-08 — Dark onboarding form surfaces

### Scope

- Route checked: `/movira-control/parks/new`
- Theme checked: dark

### Before

- Section header gradients retained light-theme `stone-50` and `white` stops, making their white headings difficult or impossible to read.
- The selected-owner summary used a translucent light violet utility that rendered as a flat grey panel in dark mode.
- The phone field wrapper used a hard-coded light border instead of the theme input border.

### Changes

- Added one reusable, theme-aware section-header surface for all four onboarding sections.
- Added a dedicated themed owner-summary surface.
- Replaced hard-coded phone-field colors with input design tokens in both the main form and owner dialog.

### Verification

- Section headings and descriptions remain readable against dark surfaces.
- Owner summary now keeps the Movira violet relationship without a light grey wash.
- Form borders now use the same dark input treatment as the other fields.
