# Recipient Biometric Unlock Specification

## Overview
This specification details the UI/UX design for the optional biometric-unlock confirmation step prior to withdrawing funds on the Recipient page (`src/pages/Recipient.tsx`). This feature introduces a local security gate (WebAuthn platform authenticator) to prevent unauthorized or accidental withdrawals before handing off the transaction to the wallet's own signing prompt. 

## Requirements
- **Opt-in Enrollment Flow**: Users must explicitly enable the local security gate.
- **Biometric Prompt UI**: Per-withdraw prompt with states for active, success, failure, and cancelled.
- **Fallback Path**: A PIN-based fallback is required if biometrics are unsupported or fail. Biometric absence must never block withdrawal entirely.
- **Accessibility**: Fallback path must be keyboard-operable. Contrast ratios must meet 4.5:1 (WCAG 2.1 AA).
- **Security Notice**: Clear documentation that this is a local UX gate only and not a substitute for on-chain transaction signing security.

## State Definitions

### 1. Enrollment Flow
- **not-enrolled**: Initial state. User sees "Enable" button on the Local Security Gate card.
- **check-support (Enrolling)**: Modal prompts user to "Register Device Biometrics" using WebAuthn.
- **set-pin**: Modal asks user to enter a 4-digit backup PIN.
- **confirm-pin**: Modal asks user to re-enter the 4-digit backup PIN.
- **success**: Confirmation that the security gate is active.

### 2. Verification Flow
- **enrolled-idle**: Security gate is enabled but no action is currently pending.
- **prompt-active**: Waiting for device biometric verification (Touch ID, Face ID, Windows Hello).
- **prompt-succeeded**: Biometric verification passed; proceeding to Freighter signing.
- **prompt-failed**: Biometric verification rejected. Provides options to "Try Again" or "Use Backup PIN".
- **prompt-cancelled**: Biometric verification cancelled by user. Provides options to "Try Again" or "Use Backup PIN".
- **unsupported-device-fallback**: PIN entry modal shown when biometrics are unavailable or user chooses to skip biometrics.

## Design Specs & Accessibility Annotations

### Contrast Requirements (WCAG 2.1 AA)
- **Primary Text**: `var(--color-text-primary)` against `var(--color-bg-surface)` must meet >= 4.5:1.
- **Secondary Text**: `var(--color-text-secondary)` against `var(--color-bg-surface)` must meet >= 4.5:1.
- **Fallback Button**: `.ui-secondary-control` must have sufficient border/text contrast against modal background.
- **Error States**: Error messages (`var(--color-danger)`) must meet >= 4.5:1 against the background.

### Keyboard & Screen Reader Accessibility
- **Focus Management**: Focus is trapped inside the `.security-modal` when active (`useModalAccessibility` hook).
- **Fallback Action**: The "Use Backup PIN" and "Skip to Wallet signing" buttons are fully focusable via `Tab`. 
- **PIN Keypad**: Keypad buttons have explicit `aria-label` where necessary (e.g., "Backspace") and are grouped under `role="group"` with `aria-label="PIN keypad"`.
- **Screen Reader Announcements**: Hidden screen reader text (`.sr-only`) announces the current length of the entered PIN.
- **Escape Key**: Modal can be closed using the Escape key or the close button (`aria-label="Close verification dialog"`).

### Responsive Design
- The `.security-modal` is designed to be responsive, taking full width on mobile viewports (with padding) and centering on desktop.
- The `pin-keypad` uses CSS Grid to ensure large, tappable touch targets (min 44x44px per Apple/Android HIG) for mobile device users.

## Security Disclaimer
The biometric and PIN verification is strictly a local UX friction layer. It **does not** handle private keys or replace the cryptographic signature required by the Freighter wallet to authorize the on-chain Soroban contract invocation.

## Hand-off Checklist
- [x] States defined and implemented in `src/pages/Recipient.tsx`
- [x] Tokens and redlines integrated via `Recipient.css` / CSS variables
- [x] Fallback path (PIN) always available
- [x] Keyboard focus trap and ARIA labels implemented
- [x] Biometric skip path tested
