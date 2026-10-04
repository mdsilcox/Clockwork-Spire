// Graceful failure: a render error never blanks the screen, and a save that cannot reach the disk says so once.
import { Component } from 'preact';
import type { ComponentChildren } from 'preact';
import { signal } from '@preact/signals';
import { saveNotice } from './save';

/** Debug: flip to true to make the next render throw (proves the boundary; used by e2e). */
export const crashNow = signal(false);

/** Renders nothing; throws when `crashNow` is set. */
export function CrashProbe() {
  if (crashNow.value) throw new Error('debug crash');
  return null;
}

interface Props {
  children?: ComponentChildren;
}
interface State {
  failed: boolean;
}

/** Catches render errors below it and shows a calm message with a Reload button. */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(err: unknown): void {
    try {
      console.warn('Render error caught by the boundary:', err);
    } catch {
      /* nothing more to do */
    }
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div
        data-testid="error-boundary"
        role="alert"
        style="min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;padding:24px;text-align:center;background:#1b1713;color:#f1e6d0;font-family:Georgia,serif"
      >
        <h1 style="margin:0;font-size:1.6rem">Something slipped a gear</h1>
        <p style="margin:0;max-width:30em;opacity:0.85">Your progress is safe. Reloading usually puts things right.</p>
        <button
          data-testid="error-reload"
          onClick={() => window.location.reload()}
          style="padding:10px 22px;font-size:1rem;border-radius:8px;border:0;background:#c9923b;color:#1b1713;cursor:pointer"
        >
          Reload
        </button>
      </div>
    );
  }
}

/** A small notice when progress cannot be written to this browser (private mode or a full disk). */
export function SaveNotice() {
  if (!saveNotice.value) return null;
  return (
    <div
      data-testid="save-notice"
      role="status"
      style="position:fixed;left:50%;bottom:8px;transform:translateX(-50%);z-index:9999;padding:6px 14px;border-radius:999px;background:#2b241c;color:#f1e6d0;border:1px solid #c9923b;font:13px Georgia,serif;pointer-events:none;max-width:92vw;text-align:center"
    >
      Progress won't be saved in this window
    </div>
  );
}
