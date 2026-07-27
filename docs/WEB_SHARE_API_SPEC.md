# Web Share API integration spec

## Overview

This spec defines the share/copy interaction for address and stream-link surfaces in the Fluxora frontend. The goal is to prefer the native Web Share API on supporting mobile browsers while preserving a reliable copy fallback on desktop and unsupported environments.

## Interaction states

### Shared action button states
- `default`: shows a share icon when `navigator.share` is available; otherwise shows a copy icon.
- `share-supported`: the button label is `Share <target>` and uses the native share sheet.
- `share-unsupported`: the button label is `Copy <target>` and copies the value to the clipboard.
- `share-in-progress`: the button remains disabled while the share promise resolves; no duplicate action is triggered.
- `share-cancelled-by-user`: the button returns to the default state and announces a gentle `Share cancelled` message.
- `copy-failed`: the button surfaces an accessible error message and falls back to the URL/address being visible in the UI.

### Feedback patterns
- Native share success: announce `Address shared` or `Stream URL shared` in an ARIA live region.
- Clipboard success: announce `Address copied` or `Stream URL copied`.
- Clipboard failure: announce a descriptive error message and preserve the visible address/URL as a manual fallback.

## Payload definitions

### Address payload
- Title: `Stellar address`
- Text: `Stellar address: <address>`
- URL: omitted

### Stream link payload
- Title: `Stream created`
- Text: `View my Stellar stream and withdraw funds.`
- URL: `<streamUrl>`

## Accessibility requirements

- The action button must expose an accessible name that reflects the active mode:
  - `Share address: <address>` when sharing is supported
  - `Copy address: <address>` when sharing is unsupported
  - `Share stream URL` / `Copy stream URL` for the modal
- The active state must be announced via `aria-live` and the control must remain keyboard operable with Enter/Space.
- Focus must remain on the triggering control after the share sheet closes or after a copy confirmation.

## Visual design notes

- Icon button uses the same 42px control size as the existing modal copy button and the same compact 14px icon treatment used in the address chip.
- Share state uses the existing action color token with a subtle success tint after a successful action.
- Contrast targets meet WCAG 2.1 AA for icon/text and focus ring visibility.

## Testing checklist

- Verify the share path on supported mobile browsers.
- Verify clipboard copy on desktop and unsupported browsers.
- Verify keyboard activation, focus retention, and screen-reader announcements.
- Verify the control remains usable when the native share sheet is dismissed or canceled.
