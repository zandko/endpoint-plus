import type {
  DevtoolsBridgeMessage,
  DevtoolsConfig,
  DevtoolsResponseCapturedPayload,
  DevtoolsRouteManifest,
  DevtoolsTypegenPreviewRequest,
  DevtoolsTypegenSaveRequest,
} from '../types';
import {
  DEVTOOLS_CONFIG,
  DEVTOOLS_PANEL_READY,
  DEVTOOLS_RESPONSE_CAPTURED,
  DEVTOOLS_ROUTE_MANIFEST,
  DEVTOOLS_TYPEGEN_OPEN,
  DEVTOOLS_TYPEGEN_PREVIEW,
  DEVTOOLS_TYPEGEN_PREVIEW_RESULT,
  DEVTOOLS_TYPEGEN_SAVE,
  DEVTOOLS_TYPEGEN_SAVED,
  DEVTOOLS_WINDOW_MESSAGE_SOURCE,
  LAUNCHER_BUTTON_ID,
  LAUNCHER_CSS,
  LAUNCHER_STYLE_ID,
  PANEL_IFRAME_STYLE,
  PANEL_WRAPPER_ID,
  PANEL_WRAPPER_STYLE,
} from '../constants';

let routeManifestBuffer: DevtoolsRouteManifest | undefined;
let devtoolsConfigBuffer: DevtoolsConfig | undefined;
let isBridgeInitialized = false;
const capturedResponseBuffer: DevtoolsResponseCapturedPayload[] = [];

function sendToPanel<TPayload>(
  event: DevtoolsBridgeMessage<TPayload>['event'],
  payload: TPayload,
): void {
  const frame = document.querySelector<HTMLIFrameElement>(`#${PANEL_WRAPPER_ID} iframe`);
  frame?.contentWindow?.postMessage(
    {
      source: DEVTOOLS_WINDOW_MESSAGE_SOURCE,
      event,
      payload,
    } satisfies DevtoolsBridgeMessage<TPayload>,
    window.location.origin,
  );
}

export function captureResponse(method: string, url: string, responseSample: unknown): void {
  const payload: DevtoolsResponseCapturedPayload = { method, url, responseSample };
  const frame = document.querySelector<HTMLIFrameElement>(`#${PANEL_WRAPPER_ID} iframe`);
  if (frame?.contentWindow) {
    sendToPanel(DEVTOOLS_RESPONSE_CAPTURED, payload);
  } else {
    capturedResponseBuffer.push(payload);
  }
}

export function installBridge(config: DevtoolsConfig): void {
  devtoolsConfigBuffer = config;

  if (isBridgeInitialized) {
    return;
  }

  isBridgeInitialized = true;
  window.addEventListener('message', (message) => {
    const data = message.data as DevtoolsBridgeMessage | undefined;
    if (!data || data.source !== DEVTOOLS_WINDOW_MESSAGE_SOURCE) {
      return;
    }

    if (data.event === DEVTOOLS_PANEL_READY) {
      if (devtoolsConfigBuffer) {
        sendToPanel(DEVTOOLS_CONFIG, devtoolsConfigBuffer);
      }
      if (routeManifestBuffer) {
        sendToPanel(DEVTOOLS_ROUTE_MANIFEST, routeManifestBuffer);
      }
      for (const captured of capturedResponseBuffer) {
        sendToPanel(DEVTOOLS_RESPONSE_CAPTURED, captured);
      }
      capturedResponseBuffer.length = 0;
      import.meta.hot?.send(DEVTOOLS_PANEL_READY);
      return;
    }

    if (!import.meta.hot) {
      return;
    }

    if (data.event === DEVTOOLS_TYPEGEN_PREVIEW) {
      import.meta.hot.send(DEVTOOLS_TYPEGEN_PREVIEW, data.payload as DevtoolsTypegenPreviewRequest);
      return;
    }

    if (data.event === DEVTOOLS_TYPEGEN_SAVE) {
      import.meta.hot.send(DEVTOOLS_TYPEGEN_SAVE, data.payload as DevtoolsTypegenSaveRequest);
      return;
    }

    if (data.event === DEVTOOLS_TYPEGEN_OPEN && typeof data.payload === 'string') {
      import.meta.hot.send(DEVTOOLS_TYPEGEN_OPEN, data.payload);
    }
  });

  import.meta.hot?.on(DEVTOOLS_TYPEGEN_PREVIEW_RESULT, (result) => {
    sendToPanel(DEVTOOLS_TYPEGEN_PREVIEW_RESULT, result);
  });

  import.meta.hot?.on(DEVTOOLS_TYPEGEN_SAVED, (result) => {
    sendToPanel(DEVTOOLS_TYPEGEN_SAVED, result);
  });

  import.meta.hot?.on(DEVTOOLS_ROUTE_MANIFEST, (manifest) => {
    routeManifestBuffer = manifest as DevtoolsRouteManifest;
    sendToPanel(DEVTOOLS_ROUTE_MANIFEST, routeManifestBuffer);
  });
}

export function mountLauncherButton(basePath: string): void {
  if (document.getElementById(LAUNCHER_BUTTON_ID)) {
    return;
  }

  // Inject stylesheet once
  if (!document.getElementById(LAUNCHER_STYLE_ID)) {
    const style = document.createElement('style');
    style.id = LAUNCHER_STYLE_ID;
    style.textContent = LAUNCHER_CSS;
    document.head.append(style);
  }

  const button = document.createElement('button');
  button.id = LAUNCHER_BUTTON_ID;
  button.type = 'button';
  button.setAttribute('aria-label', 'Open endpoint-plus devtools');

  // ::before is the dot indicator (CSS-only), the <span> holds the text label
  const label = document.createElement('span');
  label.textContent = 'endpoint+';
  button.append(label);

  button.addEventListener('click', () => togglePanel(basePath, button));
  document.documentElement.append(button);
}

function togglePanel(basePath: string, button: HTMLButtonElement): void {
  const existing = document.getElementById(PANEL_WRAPPER_ID);
  if (existing) {
    existing.remove();
    button.dataset['open'] = 'false';
    return;
  }

  const panel = document.createElement('div');
  panel.id = PANEL_WRAPPER_ID;
  panel.style.cssText = PANEL_WRAPPER_STYLE;

  const frame = document.createElement('iframe');
  frame.src = basePath;
  frame.title = 'endpoint-plus devtools';
  frame.style.cssText = PANEL_IFRAME_STYLE;
  frame.addEventListener('load', () => {
    if (devtoolsConfigBuffer) {
      sendToPanel(DEVTOOLS_CONFIG, devtoolsConfigBuffer);
    }
  });

  panel.append(frame);
  document.documentElement.append(panel);
  button.dataset['open'] = 'true';
}
