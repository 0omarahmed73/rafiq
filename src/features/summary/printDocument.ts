import { accentCss, normalizeAccent } from '../../lib/accents';
import appCss from '../../styles/tokens.css?inline';
import printCss from './print.css?inline';

/** Native print loads this document under a fixed local origin that maps only to the bundled app assets. */
export const PRINT_BASE = 'https://appassets.androidplatform.net/assets/public/';

const FONT_WEIGHTS = [400, 500, 600, 700];
const fontFaces = FONT_WEIGHTS.map(
  (weight) =>
    `@font-face{font-family:'IBM Plex Sans Arabic';font-style:normal;font-display:block;font-weight:${weight};` +
    `src:url('fonts/ibm-plex-sans-arabic-${weight}.woff2') format('woff2');}`,
).join('');

/**
 * A full light-theme, RTL document holding only the rendered summary article, for the native print view.
 * React has already escaped the user's text; scripts and event attributes are removed as a second guard.
 */
export function buildPrintDocument(article: HTMLElement, accent: string | undefined): string {
  const copy = article.cloneNode(true) as HTMLElement;
  copy.querySelectorAll('script, iframe, object, embed, link, base').forEach((node) => node.remove());
  for (const node of [copy, ...Array.from(copy.querySelectorAll<HTMLElement>('*'))]) {
    for (const attribute of Array.from(node.attributes)) {
      if (attribute.name.toLowerCase().startsWith('on')) node.removeAttribute(attribute.name);
    }
  }
  const id = normalizeAccent(accent);
  return (
    `<!doctype html><html lang="ar" dir="rtl" data-theme="light" data-accent="${id}"><head>` +
    `<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">` +
    `<base href="${PRINT_BASE}"><title>ملخّص لمعالجي</title>` +
    `<style>${fontFaces}${appCss}\n${accentCss()}\n${printCss}</style></head>` +
    `<body><div class="print-area">${copy.outerHTML}</div></body></html>`
  );
}
