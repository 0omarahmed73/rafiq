import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { sources, symptoms } from '../../content/library';
import { LibraryPage } from './LibraryPage';
import { ReadingPage } from './ReadingPage';
import { SymptomPage } from './SymptomPage';
import { SymptomsPage } from './SymptomsPage';

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/library" element={<LibraryPage />} />
        <Route path="/library/about" element={<ReadingPage page="about" />} />
        <Route path="/library/hope" element={<ReadingPage page="hope" />} />
        <Route path="/library/symptoms" element={<SymptomsPage />} />
        <Route path="/library/symptoms/:id" element={<SymptomPage />} />
        <Route path="*" element={<div>خارج المكتبة</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('LibraryPage', () => {
  it('opens with a calm intro, says it is not a diagnosis, and links the three sections', () => {
    renderAt('/library');
    expect(screen.getByRole('heading', { level: 1, name: 'مكتبتي' })).toBeInTheDocument();
    expect(screen.getByText(/ليست تشخيصًا/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /ما هو اضطراب الشخصية الحدّية/ })).toHaveAttribute('href', '/library/about');
    expect(screen.getByRole('link', { name: /الأعراض بكلمات رحيمة/ })).toHaveAttribute('href', '/library/symptoms');
    expect(screen.getByRole('link', { name: /الأمل والتعافي/ })).toHaveAttribute('href', '/library/hope');
  });

  it('tells the reader the texts are drafts waiting for a therapist', () => {
    renderAt('/library');
    expect(screen.getByText(/مسودة للمراجعة/)).toBeInTheDocument();
  });

  it('keeps the crisis page one tap away', () => {
    renderAt('/library');
    expect(screen.getByRole('link', { name: /أحتاج تهدئة/ })).toHaveAttribute('href', '/calm');
  });
});

describe('ReadingPage', () => {
  it.each([
    ['about', 'ما هو اضطراب الشخصية الحدّية؟'],
    ['hope', 'الأمل والتعافي'],
  ] as const)('shows every section of %s, the draft badge, and its sources behind a button', async (page, title) => {
    renderAt(`/library/${page}`);
    expect(screen.getByRole('heading', { level: 1, name: title })).toBeInTheDocument();
    expect(screen.getByText('مسودة للمراجعة')).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 2 }).length).toBeGreaterThanOrEqual(5);
    expect(screen.getByText(/هذا ليس تشخيصًا/)).toBeInTheDocument();

    const toggle = screen.getByRole('button', { name: /المصادر/ });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await userEvent.setup().click(toggle);
    const region = screen.getByRole('region', { name: /المصادر/ });
    expect(within(region).getAllByRole('listitem').length).toBeGreaterThanOrEqual(3);
  });

  it('writes source addresses as selectable text, never as links that leave the app', async () => {
    renderAt('/library/hope');
    await userEvent.setup().click(screen.getByRole('button', { name: /المصادر/ }));
    const region = screen.getByRole('region', { name: /المصادر/ });
    expect(within(region).queryAllByRole('link')).toHaveLength(0);
    expect(region).toHaveTextContent('pubmed.ncbi.nlm.nih.gov/16648323');
  });

  it('shows the limit of a source next to it', async () => {
    renderAt('/library/hope');
    await userEvent.setup().click(screen.getByRole('button', { name: /المصادر/ }));
    expect(screen.getByText(/عيّنة صغيرة، كلها نساء/)).toBeInTheDocument();
  });

  it('keeps the crisis page one tap away', () => {
    renderAt('/library/about');
    expect(screen.getByRole('link', { name: /أحتاج تهدئة/ })).toHaveAttribute('href', '/calm');
  });
});

describe('SymptomsPage', () => {
  it('lists the nine symptoms as links and says it is not a test', () => {
    renderAt('/library/symptoms');
    expect(screen.getByRole('heading', { level: 1, name: 'الأعراض بكلمات رحيمة' })).toBeInTheDocument();
    const list = screen.getByRole('list', { name: 'الأعراض' });
    const items = within(list).getAllByRole('link');
    expect(items).toHaveLength(9);
    for (const s of symptoms) expect(screen.getByRole('link', { name: new RegExp(s.title) })).toHaveAttribute('href', `/library/symptoms/${s.id}`);
    expect(screen.getByText(/لا اختبار ولا نتيجة/)).toBeInTheDocument();
  });
});

describe('SymptomPage', () => {
  it('shows how it can feel, the need behind it, sentences to choose from, and a tool to open', () => {
    renderAt('/library/symptoms/anger');
    const s = symptoms.find((x) => x.id === 'anger')!;
    expect(screen.getByRole('heading', { level: 1, name: s.title })).toBeInTheDocument();
    expect(screen.getByText('مسودة للمراجعة')).toBeInTheDocument();
    expect(screen.getByText(s.feels)).toBeInTheDocument();
    expect(screen.getByText(s.need)).toBeInTheDocument();
    const list = screen.getByRole('list', { name: /جمل/ });
    expect(within(list).getAllByRole('listitem')).toHaveLength(s.selfSentences.length);
    expect(screen.getByText(/أختار ما يناسبني أو لا أختار شيئًا/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: s.tool.label })).toHaveAttribute('href', s.tool.to);
    expect(screen.getByRole('button', { name: /المصادر/ })).toBeInTheDocument();
  });

  it('puts help first on the symptom about harm', () => {
    renderAt('/library/symptoms/self-harm');
    const banner = screen.getByRole('region', { name: 'مساعدة فورية' });
    expect(within(banner).getByRole('link', { name: /أحتاج مساعدة الآن/ })).toHaveAttribute('href', '/calm');
    const heading = screen.getByRole('heading', { level: 1 });
    expect(banner.compareDocumentPosition(heading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('shows the extra caution when a symptom has one', () => {
    renderAt('/library/symptoms/impulsivity');
    expect(screen.getByText(/فترات مزاج أو طاقة مرتفعة/)).toBeInTheDocument();
  });

  it('goes back to the list for an unknown symptom', () => {
    renderAt('/library/symptoms/nope');
    expect(screen.getByRole('heading', { level: 1, name: 'الأعراض بكلمات رحيمة' })).toBeInTheDocument();
  });

  it('links back to the list and keeps the crisis page one tap away', () => {
    renderAt('/library/symptoms/mood');
    expect(screen.getByRole('link', { name: /الأعراض/ })).toHaveAttribute('href', '/library/symptoms');
    expect(screen.getAllByRole('link', { name: /أحتاج تهدئة/ })[0]).toHaveAttribute('href', '/calm');
  });
});

describe('library sources', () => {
  it('has a source for every id the pages cite', () => {
    expect(sources.map((s) => s.id)).toEqual(expect.arrayContaining(['nhs', 'nimh', 'kverme2019']));
  });
});
