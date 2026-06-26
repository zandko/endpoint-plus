export * from './protocol.ts';

export const DEFAULT_BASE_PATH = '/__endpoint-plus-devtools/';
export const DEFAULT_TYPEGEN_OUTPUT_FILE = 'src/types/endpoint-plus.generated.d.ts';

export const LAUNCHER_BUTTON_ID = 'endpoint-plus-devtools-launcher';
export const PANEL_WRAPPER_ID = 'endpoint-plus-devtools-panel';
export const LAUNCHER_STYLE_ID = 'endpoint-plus-devtools-style';

/**
 * CSS injected once into the host page.
 *
 * Resting state: a tiny pill anchored flush to the bottom-right edge,
 * showing only an icon dot — barely visible, never obstructs content.
 *
 * Hover state: expands upward into a full labelled button with a
 * spring-cubic-bezier animation. Width is driven by max-width so the pill
 * container naturally shrinks to the dot when collapsed without layout jank.
 *
 * Key decisions:
 *  - `will-change: transform, width` hoists to compositor — no layout reflow on hover.
 *  - `white-space: nowrap` + `overflow: hidden` on the whole button prevents
 *    wrapping artefacts during width transition.
 *  - `pointer-events: none` on the text span avoids spurious mouseleave flicker.
 */
export const LAUNCHER_CSS = `
#${LAUNCHER_BUTTON_ID} {
  /* --- Positioning --- */
  position: fixed;
  right: 20px;
  bottom: 0;
  z-index: 2147483647;

  /* --- Layout --- */
  display: inline-flex;
  align-items: center;
  gap: 0;
  overflow: hidden;
  white-space: nowrap;

  /* --- Resting pill size (dot-only) --- */
  width: 28px;
  height: 24px;
  padding: 0;
  border: none;
  border-radius: 6px 6px 0 0;
  cursor: pointer;
  outline: none;
  user-select: none;

  /* --- Colour --- */
  background: #42b883;

  /* --- Shadow --- */
  box-shadow: 0 -2px 10px rgba(66, 184, 131, 0.25);

  /* --- Transition (compositor-only properties to avoid reflow) --- */
  transition:
    width         0.28s cubic-bezier(0.34, 1.3, 0.64, 1),
    height        0.22s cubic-bezier(0.34, 1.3, 0.64, 1),
    border-radius 0.22s ease,
    box-shadow    0.22s ease,
    background    0.16s ease;

  will-change: width, height;
}

/* --- Hover: expand to full pill --- */
#${LAUNCHER_BUTTON_ID}:hover {
  width: 110px;
  height: 30px;
  border-radius: 6px 6px 0 0;
  background: #3aaa78;
  box-shadow:
    0 -4px 16px rgba(66, 184, 131, 0.35),
    0  2px  6px rgba(66, 184, 131, 0.15);
}

#${LAUNCHER_BUTTON_ID}:active {
  background: #35a070;
  box-shadow: 0 -2px 8px rgba(66, 184, 131, 0.2);
}

/* --- Dot indicator (always visible, centred in resting state) --- */
#${LAUNCHER_BUTTON_ID}::before {
  content: '';
  flex-shrink: 0;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.85);
  margin-left: 11px;
  transition: margin-left 0.28s cubic-bezier(0.34, 1.3, 0.64, 1), transform 0.16s ease;
}

#${LAUNCHER_BUTTON_ID}:hover::before {
  margin-left: 12px;
}

#${LAUNCHER_BUTTON_ID}[data-open='true']::before {
  background: #fff;
  transform: scale(1.25);
}

/* --- Label text (fades in alongside width expansion) --- */
#${LAUNCHER_BUTTON_ID} > span {
  font: 600 11px/1 ui-monospace, SFMono-Regular, Menlo, monospace;
  letter-spacing: 0.04em;
  color: #fff;
  margin-left: 5px;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.14s ease 0.06s;
}

#${LAUNCHER_BUTTON_ID}:hover > span {
  opacity: 1;
}
`;

export const PANEL_WRAPPER_STYLE = [
  'position:fixed',
  'right:18px',
  'bottom:62px',
  'z-index:2147483646',
  'width:min(1280px,calc(100vw - 36px))',
  'height:min(820px,calc(100vh - 90px))',
  'border:1px solid rgba(148,163,184,.3)',
  'border-radius:12px',
  'overflow:hidden',
  'background:#f8fafc',
  'box-shadow:0 28px 90px rgba(15,23,42,.22),0 4px 16px rgba(15,23,42,.1)',
].join(';');

export const PANEL_IFRAME_STYLE =
  'width:100%;height:100%;border:0;display:block;background:#f8fafc';
