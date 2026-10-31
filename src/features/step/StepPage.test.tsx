import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { readinessQuestions } from '../../content/readiness';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { accept } from '../../content/practices/accept';
import { steps } from '../../content';
import { createMemoryRepo } from '../../db/memoryRepo';
import type { Repo } from '../../db/repo';
import { RepoProvider } from '../../db/RepoContext';
import { applySink } from '../practice/engine';
import { StepPage } from './StepPage';

function renderStep(path: string, repo: Repo = createMemoryRepo()) {
  render(
    <RepoProvider repo={repo}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/step/:id" element={<StepPage />} />
        </Routes>
      </MemoryRouter>
    </RepoProvider>,
  );
}

describe('StepPage', () => {
  it('shows the step title, core question and lesson', async () => {
    renderStep('/step/2');
    const step = steps[1];
    expect(await screen.findByRole('heading', { name: step.title })).toBeInTheDocument();
    expect(screen.getByText(step.coreQuestion)).toBeInTheDocument();
    expect(screen.getByText(step.lesson)).toBeInTheDocument();
    expect(screen.getByText('الخطوة ٢ من ١٠')).toBeInTheDocument();
  });

  it('links to each practice of the step', async () => {
    renderStep('/step/3');
    expect(await screen.findByRole('link', { name: /سجلّ الموقف/ })).toHaveAttribute(
      'href',
      '/practice/regulation',
    );
    expect(screen.getByRole('link', { name: /المحاولات والنتيجة/ })).toHaveAttribute(
      'href',
      '/practice/regulation-followup',
    );
  });

  it('shows the acceptance decision and its reasons once the practice is finished', async () => {
    const repo = createMemoryRepo();
    await applySink(repo, accept, {
      id: 'r1',
      practiceId: 'accept',
      stepId: 2,
      startedAt: '2026-10-31T10:00:00.000Z',
      completedAt: '2026-10-31T10:05:00.000Z',
      answers: { a6: { value: 'change' }, a7: ['أكرّر الخطأ نفسه', 'أتأذّى في كل مرة'] },
      share: false,
      forNextSession: false,
      updatedAt: '',
    });
    renderStep('/step/2', repo);

    expect(await screen.findByText('أتقبّله وأغيّره')).toBeInTheDocument();
    expect(screen.getByText('أكرّر الخطأ نفسه')).toBeInTheDocument();
    expect(screen.getByText('أتأذّى في كل مرة')).toBeInTheDocument();
  });

  it('shows no decision card before the practice is done', async () => {
    renderStep('/step/2');
    await screen.findByRole('heading', { name: steps[1].title });
    expect(screen.queryByText('قرارك')).not.toBeInTheDocument();
  });

  it('offers the readiness check without hiding the way to other steps', async () => {
    renderStep('/step/4');
    expect(await screen.findByRole('heading', { name: 'هل أنا جاهز للخطوة التالية؟' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '‹ الرحلة' })).toHaveAttribute('href', '/journey');
  });

  it('says the step does not exist for an unknown id', () => {
    renderStep('/step/99');
    expect(screen.getByText('هذه الخطوة غير موجودة')).toBeInTheDocument();
  });

  it('says the privacy rule for what is written in the exercises', async () => {
    renderStep('/step/1');
    expect(await screen.findByText(/ولا يظهر في ملخّص معالجي إلا إذا اخترتُ مشاركته/)).toBeInTheDocument();
  });
});


describe('Step4 owner guide', () => {
  it('shows shame story, non-judging rules and the new problem practice', async () => {
    renderStep('/step/4');
    expect(await screen.findByRole('heading', { name: 'قصة الخزي' })).toBeVisible();
    expect(screen.getByText('مشكلة صعبة لم أصل فيها إلى حلّ بعد')).toBeVisible();
    expect(screen.getByText(/أكتب قصة الخزي كما عشتُها، بصدق ووضوح/)).toBeVisible();
    expect(screen.getByText(/أقرأ قصتي دون أحكام قاسية ودون جلد للذات/)).toBeVisible();
    expect(screen.getByText('ألاحظ النمط الذي أكرره، وأسأل: ممَّ كان يحاول حمايتي؟')).toBeInTheDocument();
    expect(screen.getByText('أسأل نفسي بإنصاف: هل توفّر لي ما يكفي من الأمان والدعم حين حاولتُ التغيير؟')).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/نمط تكيّفي|ترجمة صادقة|المقولبة|أتفحّص/);
    expect(screen.getByRole('link', { name: 'أفهم مشكلة صعبة' })).toHaveAttribute('href', '/practice/self-understanding');
    expect(screen.getByRole('link', { name: 'تتبّع المحفّز' })).toHaveAttribute('href', '/practice/understand');
  });
});


it('opens the next step with its own unanswered readiness controls', async () => {
  const repo = createMemoryRepo();
  await repo.saveStepProgress({ stepId: 2, status: 'done', daysPracticed: [], readiness: { answers: [5, 5, 5], at: '2026-10-31T10:00:00Z' } });
  renderStep('/step/2', repo);
  await userEvent.setup().click(await screen.findByRole('link', { name: 'أنتقل إلى الخطوة التالية' }));
  await screen.findByRole('heading', { name: 'تنظيم الذات' });
  const group = screen.getByRole('group', { name: readinessQuestions[3][0] });
  for (const input of within(group).getAllByRole('radio')) expect(input).not.toBeChecked();
  expect(screen.queryByText('يبدو أن الوقت مناسب للانتقال إلى الخطوة التالية.')).not.toBeInTheDocument();
});


it('links Step4 to the saved journal', async () => {
  renderStep('/step/4');
  expect(await screen.findByRole('link', { name: 'محفزاتي' })).toHaveAttribute('href', '/triggers');
});
