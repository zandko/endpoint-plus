import type { DevtoolsBridgeMessage } from '../types/index.ts';
import {
  DEVTOOLS_TYPEGEN_OPEN,
  DEVTOOLS_TYPEGEN_PREVIEW,
  DEVTOOLS_TYPEGEN_SAVE,
  DEVTOOLS_WINDOW_MESSAGE_SOURCE,
} from '../constants/index.ts';

/**
 * Send an event from the devtools panel to the host.
 *
 * When running inside the Vite dev server (HMR available), preview/save/open
 * requests are forwarded directly via the HMR WS channel — no postMessage hop.
 *
 * When running as a standalone iframe in the host page, events are posted to
 * `window.parent`.
 */
export function sendToHost<TPayload>(
  event: DevtoolsBridgeMessage<TPayload>['event'],
  payload?: TPayload,
): void {
  const HMR_EVENTS = [
    DEVTOOLS_TYPEGEN_PREVIEW,
    DEVTOOLS_TYPEGEN_SAVE,
    DEVTOOLS_TYPEGEN_OPEN,
  ] as string[];

  if (import.meta.hot && HMR_EVENTS.includes(event)) {
    import.meta.hot.send(event, payload);
    return;
  }

  if (typeof window === 'undefined' || window.parent === window) return;

  window.parent.postMessage(
    {
      source: DEVTOOLS_WINDOW_MESSAGE_SOURCE,
      event,
      payload,
    } satisfies DevtoolsBridgeMessage<TPayload>,
    window.location.origin,
  );
}
