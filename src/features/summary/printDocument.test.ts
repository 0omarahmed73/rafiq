import { buildPrintDocument } from './printDocument';

function article(html: string) {
  document.body.innerHTML = `<div id="splash">شاشة البداية</div><nav>التبويبات</nav><main>${html}</main>`;
  return document.querySelector('article') as HTMLElement;
}

describe('buildPrintDocument', () => {
  it('printsOnlySelectedArticle', () => {
    const doc = buildPrintDocument(article('<article><h1>ملخّصي</h1><p>١٢ يومًا</p></article>'), undefined);
    expect(doc).toContain('ملخّصي');
    expect(doc).toContain('١٢ يومًا');
    expect(doc).not.toContain('شاشة البداية');
    expect(doc).not.toContain('التبويبات');
    expect(doc).not.toContain('<nav');
  });

  it('keepsArabicEscapedAsText', () => {
    const el = article('<article><p id="t"></p></article>');
    el.querySelector('#t')!.textContent = '<img src=x onerror=alert(1)> مرحبًا';
    el.insertAdjacentHTML('beforeend', '<script>alert(1)</script><p onclick="steal()">نص</p>');
    const doc = buildPrintDocument(el, undefined);
    expect(doc).toContain('&lt;img src=x onerror=alert(1)&gt; مرحبًا');
    expect(doc).not.toContain('<img');
    expect(doc).not.toContain('<script');
    expect(doc).not.toContain('onclick');
    expect(doc).toContain('نص');
  });

  it('hasLocalFontsAndLightAccent', () => {
    const doc = buildPrintDocument(article('<article>x</article>'), 'rose');
    expect(doc).toContain('<html lang="ar" dir="rtl" data-theme="light" data-accent="rose">');
    expect(doc).toContain('<base href="https://appassets.androidplatform.net/assets/public/">');
    for (const weight of [400, 500, 600, 700]) {
      expect(doc).toContain(`url('fonts/ibm-plex-sans-arabic-${weight}.woff2')`);
    }
    const urls = (doc.match(/https?:\/\/[^\s"')]+/g) ?? []).filter((u) => !u.startsWith('http://www.w3.org/'));
    expect(urls).toEqual(['https://appassets.androidplatform.net/assets/public/']);
  });

  it('falls back to the default accent for an unknown value', () => {
    expect(buildPrintDocument(article('<article>x</article>'), 'nope')).toContain('data-accent="teal"');
  });
});
