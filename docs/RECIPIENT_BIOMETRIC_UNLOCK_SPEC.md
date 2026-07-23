# Recipient Withdraw Biometric Unlock UX Specification

This document defines the design, security boundaries, state transitions, and accessibility compliance for the local biometric confirmation gate on the Recipient page.

## 1. Overview & Security Boundaries

The **Local Security Gate** is a local authentication mechanism configured to prevent unauthorized transaction initiation directly from the device. 

> [!IMPORTANT]
> **Security Boundaries:**
> - This gate is a **local confirmation step only** and does not manage, store, or replace cryptographic keys.
> - Transaction signing is still performed on-chain via the Freighter browser extension.
> - The biometric enrollments use the browser standard WebAuthn API (`navigator.credentials.create` and `navigator.credentials.get`).
> - A 4-digit backup PIN is configured as a fallback.
> - A "Skip to Wallet signing" bypass is provided to prevent funds from being permanently locked due to local authenticator failures.

---

## 2. Opt-in Enrollment Flow

The enrollment flow is hosted in a dedicated card on the Recipient page.

1. **Status Checked:** On render, the page checks if the gate is enabled via `localStorage` (`fluxora_security_gate_enabled`).
2. **Setup Initiation:** Clicking "Enable" opens the **Enrollment Modal**.
3. **Biometric Support Detection:**
   - The UI checks if `window.PublicKeyCredential` is available and calls `PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()`.
   - If supported, the user is prompted to register their platform authenticator (Touch ID, Face ID, Windows Hello).
   - If not supported, the flow skips to PIN setup.
4. **Backup PIN Setup:**
   - The user inputs a 4-digit security PIN.
   - The user re-enters the PIN to confirm.
5. **Success Stage:** The gate is marked active, and settings are saved.

---

## 3. Interaction States

The security gate lifecycle is defined by 8 distinct UX states:

| State | Description | UI representation |
| :--- | :--- | :--- |
| `not-enrolled` | Gate is disabled. | Settings card shows status "Disabled", action button "Enable". |
| `enrolling` | Setup wizard modal is active. | Modal displays biometric enrollment or PIN creation pad. |
| `enrolled-idle` | Gate is enabled and waiting. | Settings card shows status "Active", action buttons "Disable" and "Change PIN". |
| `prompt-active` | Withdrawal initiated, waiting for biometric verification. | Verification modal shows a fingerprint icon with a pulse animation. WebAuthn prompt is active. |
| `prompt-succeeded` | Verification succeeded. | Modal displays a checkmark with status "Verification Succeeded!" and automatically transitions. |
| `prompt-failed` | Verification failed. | Modal displays an error badge, "Try Again", and "Use Backup PIN" options. |
| `prompt-cancelled` | Verification cancelled by the user. | Modal displays a warning icon, allowing retry or fallback options. |
| `unsupported-device-fallback` | Device lacks biometric hardware or verification was bypassed. | Modal displays a 4-digit PIN pad overlay for code verification. |

---

## 4. Keyboard Accessibility & WCAG Compliance

To ensure full compliance with accessibility standards:

- **Focus Trap:** When any modal opens, focus is directed inside the modal. Tab and Shift+Tab key actions are trapped within the modal scope using a ref-based focus interceptor.
- **Escape Key Interception:** Pressing the `Escape` key closes the active modal and returns focus to the trigger button.
- **Contrast Ratios:** All text elements conform to WCAG AA guidelines with a contrast ratio of at least `4.5:1` against the background.
- **Interactive Labels:** Screen reader announcements (e.g. `aria-live="polite"` and `sr-only` descriptive labels) are provided for pin length indicators and visual states.
- **Scroll Locking:** Body scrolling is locked when overlays are open to prevent disorientation.

---

## 5. Responsive Design

- **Grid/Flex Adjustments:** Layout shifts to vertical alignment on viewports narrower than `640px`.
- **PIN Pad Layout:** Circular PIN buttons are sized dynamically to ensure a comfortable touch target of at least `48px` on mobile devices.
- **Scale Animations:** Modals use smooth CSS scale-in transforms and fade-in backdrops.
