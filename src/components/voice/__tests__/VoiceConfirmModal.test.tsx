/**
 * Tests for src/components/voice/VoiceConfirmModal.tsx
 *
 * Covers:
 *  • Renders nothing when state is not confirming-destructive
 *  • Renders dialog with correct ARIA attributes (role, aria-modal, aria-labelledby, aria-describedby)
 *  • Displays destructive command phrase
 *  • Confirm button triggers confirmDestructiveAction
 *  • Cancel button triggers cancelDestructiveAction
 *  • Escape key triggers cancelDestructiveAction
 *  • Confirm button receives initial focus on open
 *  • Close (X) button triggers cancelDestructiveAction
 *  • Spoken instruction text is present ("Say Confirm" / "Say Cancel")
 *
 * Issue: #1028
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { VoiceConfirmModal } from "../VoiceConfirmModal";
import * as VoiceContextModule from "../VoiceContext";
import type { VoiceContextValue, VoiceCommandDef } from "../voiceTypes";

// ─── Mock helpers ──────────────────────────────────────────────────────────────

const DESTRUCTIVE_CMD: VoiceCommandDef = {
  id: "destructive-cancel-stream",
  phrase: "Cancel stream",
  aliases: ["delete stream", "stop stream", "terminate stream"],
  category: "Destructive",
  description: "Cancel an active streaming contract (Requires confirmation)",
  requiresConfirmation: true,
};

function buildCtx(overrides: Partial<VoiceContextValue> = {}): VoiceContextValue {
  return {
    state: "idle",
    isSupported: true,
    transcript: "",
    recognizedCommand: null,
    pendingDestructiveCommand: null,
    availableCommands: [],
    panelOpen: false,
    toggleListening: vi.fn(),
    startListening: vi.fn(),
    stopListening: vi.fn(),
    togglePanel: vi.fn(),
    confirmDestructiveAction: vi.fn(),
    cancelDestructiveAction: vi.fn(),
    processSpokenPhrase: vi.fn(() => true),
    ...overrides,
  };
}

function mockUseVoiceContext(ctx: VoiceContextValue) {
  vi.spyOn(VoiceContextModule, "useVoiceContext").mockReturnValue(ctx);
}

beforeEach(() => {
  vi.restoreAllMocks();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

// ─── Rendering gate ────────────────────────────────────────────────────────────

describe("VoiceConfirmModal — rendering gate", () => {
  it("renders nothing when state is idle", () => {
    mockUseVoiceContext(buildCtx({ state: "idle" }));
    const { container } = render(<VoiceConfirmModal />);
    expect(container.firstChild).toBeNull();
  });

  it("renders nothing when state is confirming-destructive but pendingDestructiveCommand is null", () => {
    mockUseVoiceContext(
      buildCtx({ state: "confirming-destructive", pendingDestructiveCommand: null })
    );
    const { container } = render(<VoiceConfirmModal />);
    expect(container.firstChild).toBeNull();
  });

  it("renders nothing when state is listening even if pendingDestructiveCommand is set", () => {
    mockUseVoiceContext(
      buildCtx({ state: "listening", pendingDestructiveCommand: DESTRUCTIVE_CMD })
    );
    const { container } = render(<VoiceConfirmModal />);
    expect(container.firstChild).toBeNull();
  });

  it("renders the dialog when state is confirming-destructive with pendingDestructiveCommand", () => {
    mockUseVoiceContext(
      buildCtx({
        state: "confirming-destructive",
        pendingDestructiveCommand: DESTRUCTIVE_CMD,
      })
    );
    render(<VoiceConfirmModal />);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});

// ─── ARIA accessibility ────────────────────────────────────────────────────────

describe("VoiceConfirmModal — ARIA accessibility", () => {
  it("has role=dialog", () => {
    mockUseVoiceContext(
      buildCtx({
        state: "confirming-destructive",
        pendingDestructiveCommand: DESTRUCTIVE_CMD,
      })
    );
    render(<VoiceConfirmModal />);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("has aria-modal=true", () => {
    mockUseVoiceContext(
      buildCtx({
        state: "confirming-destructive",
        pendingDestructiveCommand: DESTRUCTIVE_CMD,
      })
    );
    render(<VoiceConfirmModal />);
    expect(screen.getByRole("dialog")).toHaveAttribute("aria-modal", "true");
  });

  it("has aria-labelledby pointing to the heading", () => {
    mockUseVoiceContext(
      buildCtx({
        state: "confirming-destructive",
        pendingDestructiveCommand: DESTRUCTIVE_CMD,
      })
    );
    render(<VoiceConfirmModal />);
    const dialog = screen.getByRole("dialog");
    const labelledBy = dialog.getAttribute("aria-labelledby");
    expect(labelledBy).toBeTruthy();
    const heading = document.getElementById(labelledBy!);
    expect(heading).toBeInTheDocument();
    expect(heading).toHaveTextContent(/Voice Command Confirmation/i);
  });

  it("has aria-describedby pointing to the description", () => {
    mockUseVoiceContext(
      buildCtx({
        state: "confirming-destructive",
        pendingDestructiveCommand: DESTRUCTIVE_CMD,
      })
    );
    render(<VoiceConfirmModal />);
    const dialog = screen.getByRole("dialog");
    const describedBy = dialog.getAttribute("aria-describedby");
    expect(describedBy).toBeTruthy();
    const desc = document.getElementById(describedBy!);
    expect(desc).toBeInTheDocument();
    expect(desc).toHaveTextContent(/destructive action/i);
  });
});

// ─── Content rendering ─────────────────────────────────────────────────────────

describe("VoiceConfirmModal — content", () => {
  it("displays the destructive command phrase", () => {
    mockUseVoiceContext(
      buildCtx({
        state: "confirming-destructive",
        pendingDestructiveCommand: DESTRUCTIVE_CMD,
      })
    );
    render(<VoiceConfirmModal />);
    expect(screen.getByText(/Cancel stream/)).toBeInTheDocument();
  });

  it("displays spoken instructions mentioning Confirm and Cancel", () => {
    mockUseVoiceContext(
      buildCtx({
        state: "confirming-destructive",
        pendingDestructiveCommand: DESTRUCTIVE_CMD,
      })
    );
    render(<VoiceConfirmModal />);
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveTextContent(/Say/);
    expect(dialog).toHaveTextContent(/Confirm/);
    expect(dialog).toHaveTextContent(/Cancel/);
  });

  it("renders the heading 'Voice Command Confirmation'", () => {
    mockUseVoiceContext(
      buildCtx({
        state: "confirming-destructive",
        pendingDestructiveCommand: DESTRUCTIVE_CMD,
      })
    );
    render(<VoiceConfirmModal />);
    expect(
      screen.getByText("Voice Command Confirmation")
    ).toBeInTheDocument();
  });

  it("renders 'Destructive commands are never executed blind' text", () => {
    mockUseVoiceContext(
      buildCtx({
        state: "confirming-destructive",
        pendingDestructiveCommand: DESTRUCTIVE_CMD,
      })
    );
    render(<VoiceConfirmModal />);
    expect(
      screen.getByText(/never executed blind/i)
    ).toBeInTheDocument();
  });
});

// ─── Button interactions ───────────────────────────────────────────────────────

describe("VoiceConfirmModal — button interactions", () => {
  it("Confirm Action button calls confirmDestructiveAction", () => {
    const confirmDestructiveAction = vi.fn();
    mockUseVoiceContext(
      buildCtx({
        state: "confirming-destructive",
        pendingDestructiveCommand: DESTRUCTIVE_CMD,
        confirmDestructiveAction,
      })
    );
    render(<VoiceConfirmModal />);
    fireEvent.click(screen.getByRole("button", { name: /confirm action/i }));
    expect(confirmDestructiveAction).toHaveBeenCalledOnce();
  });

  it("Cancel button calls cancelDestructiveAction", () => {
    const cancelDestructiveAction = vi.fn();
    mockUseVoiceContext(
      buildCtx({
        state: "confirming-destructive",
        pendingDestructiveCommand: DESTRUCTIVE_CMD,
        cancelDestructiveAction,
      })
    );
    render(<VoiceConfirmModal />);
    fireEvent.click(screen.getByRole("button", { name: /^cancel$/i }));
    expect(cancelDestructiveAction).toHaveBeenCalledOnce();
  });

  it("Close (X) button calls cancelDestructiveAction", () => {
    const cancelDestructiveAction = vi.fn();
    mockUseVoiceContext(
      buildCtx({
        state: "confirming-destructive",
        pendingDestructiveCommand: DESTRUCTIVE_CMD,
        cancelDestructiveAction,
      })
    );
    render(<VoiceConfirmModal />);
    fireEvent.click(
      screen.getByRole("button", { name: /cancel destructive action/i })
    );
    expect(cancelDestructiveAction).toHaveBeenCalledOnce();
  });
});

// ─── Keyboard interactions ─────────────────────────────────────────────────────

describe("VoiceConfirmModal — keyboard", () => {
  it("Escape key calls cancelDestructiveAction", () => {
    const cancelDestructiveAction = vi.fn();
    mockUseVoiceContext(
      buildCtx({
        state: "confirming-destructive",
        pendingDestructiveCommand: DESTRUCTIVE_CMD,
        cancelDestructiveAction,
      })
    );
    render(<VoiceConfirmModal />);
    fireEvent.keyDown(window, { key: "Escape" });
    expect(cancelDestructiveAction).toHaveBeenCalledOnce();
  });

  it("does not call cancelDestructiveAction on non-Escape keys", () => {
    const cancelDestructiveAction = vi.fn();
    mockUseVoiceContext(
      buildCtx({
        state: "confirming-destructive",
        pendingDestructiveCommand: DESTRUCTIVE_CMD,
        cancelDestructiveAction,
      })
    );
    render(<VoiceConfirmModal />);
    fireEvent.keyDown(window, { key: "Enter" });
    expect(cancelDestructiveAction).not.toHaveBeenCalled();
    fireEvent.keyDown(window, { key: "Tab" });
    expect(cancelDestructiveAction).not.toHaveBeenCalled();
  });

  it("does not call cancelDestructiveAction when modal is closed", () => {
    const cancelDestructiveAction = vi.fn();
    mockUseVoiceContext(
      buildCtx({ state: "idle", cancelDestructiveAction })
    );
    render(<VoiceConfirmModal />);
    fireEvent.keyDown(window, { key: "Escape" });
    expect(cancelDestructiveAction).not.toHaveBeenCalled();
  });
});

// ─── Focus management ──────────────────────────────────────────────────────────

describe("VoiceConfirmModal — focus management", () => {
  it("auto-focuses the Confirm Action button on open", () => {
    mockUseVoiceContext(
      buildCtx({
        state: "confirming-destructive",
        pendingDestructiveCommand: DESTRUCTIVE_CMD,
      })
    );
    render(<VoiceConfirmModal />);
    // The confirm button has a ref; after the 50ms timeout it should receive focus
    vi.advanceTimersByTime(100);
    const confirmBtn = screen.getByRole("button", { name: /confirm action/i });
    expect(document.activeElement).toBe(confirmBtn);
  });
});
