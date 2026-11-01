import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { RepoProvider } from '../../db/RepoContext';
import { createMemoryRepo } from '../../db/memoryRepo';
import type { Repo } from '../../db/repo';
import { CalmPage } from './CalmPage';

function renderCalm(repo: Repo = createMemoryRepo()) {
  return render(
    <RepoProvider repo={repo}>
      <MemoryRouter>
        <CalmPage />
      </MemoryRouter>
    </RepoProvider>,
  );
}

describe('CalmPage', () => {
  it('guides a slow breath with an in-breath and a longer out-breath', () => {
    renderCalm();
    const section = screen.getByRole('region', { name: 'تنفّس هادئ' });
    expect(within(section).getByText(/شهيق/)).toBeInTheDocument();
    expect(within(section).getByText(/زفير/)).toBeInTheDocument();
  });

  it('offers the five-step grounding exercise as five items', () => {
    renderCalm();
    const list = screen.getByRole('list', { name: 'تمرين التأريض' });
    expect(within(list).getAllByRole('listitem')).toHaveLength(5);
  });

  it('tells the user to reach emergency help or a trusted person when in danger', () => {
    renderCalm();
    expect(
      screen.getByText(
        'إن شعرتُ بأنني قد أكون في خطر، أتواصل الآن مع خدمات الطوارئ في بلدي أو مع شخص أثق به.',
      ),
    ).toBeInTheDocument();
  });

  it('shows the source-linked Egypt crisis and emergency numbers when no country is saved', async () => {
    renderCalm();

    expect(await screen.findByRole('link', { name: /اتصال: الخط الساخن للصحة النفسية والدعم النفسي ١٦٣٢٨/ })).toHaveAttribute('href', 'tel:16328');
    expect(screen.getByRole('link', { name: /اتصال: الإسعاف ١٢٣/ })).toHaveAttribute('href', 'tel:123');
    expect(screen.getByRole('link', { name: /اتصال: الشرطة ١٢٢/ })).toHaveAttribute('href', 'tel:122');
    expect(screen.getByText(/خيار احتياطي محفوظ على جهازي ويعمل دون إنترنت/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /المصدر: وزارة الداخلية المصرية/ })).toHaveAttribute(
      'href',
      'https://www.moi.gov.eg/home/EmergancyNumber',
    );
  });

  it('does not show Egyptian numbers as if they worked in another selected country', async () => {
    const repo = createMemoryRepo();
    await repo.saveSettings({ id: 'settings', theme: 'system', currentCountryCode: 'US' });
    renderCalm(repo);

    expect(await screen.findByText(/لا أعرض أرقام مصر على أنها تعمل خارجها/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'دليل دولي للعثور على خط مساعدة في بلدي' })).toHaveAttribute(
      'href',
      'https://www.iasp.info/crisis-centres-helplines/',
    );
    expect(screen.queryByRole('link', { name: /اتصال:/ })).not.toBeInTheDocument();
  });

  it('can always lead back home', () => {
    renderCalm();
    expect(screen.getByRole('link', { name: /الرئيسية/ })).toHaveAttribute('href', '/');
  });
});
