import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { createMemoryRepo } from '../../db/memoryRepo';
import { RepoProvider } from '../../db/RepoContext';
import { CheckinPage } from './CheckinPage';

const wholeRange = { from: '2000-01-01', to: '2999-12-31' };

function setup() {
  const repo = createMemoryRepo();
  render(
    <RepoProvider repo={repo}>
      <MemoryRouter>
        <CheckinPage />
      </MemoryRouter>
    </RepoProvider>,
  );
  return { repo, user: userEvent.setup() };
}

describe('CheckinPage navigation', () => {
  it('has a back link to Home at the top, before the heading', async () => {
    setup();
    const back = await screen.findByRole('link', { name: /الرئيسية/ });
    expect(back).toHaveAttribute('href', '/');
    const heading = screen.getByRole('heading', { name: 'ما الذي أشعر به الآن؟' });
    expect(back.compareDocumentPosition(heading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});

describe('CheckinPage wording', () => {
  it('speaks in the first person', async () => {
    setup();
    expect(await screen.findByRole('heading', { name: 'ما الذي أشعر به الآن؟' })).toBeInTheDocument();
    expect(screen.getByText('أختار كلمة أو أكثر. لا توجد مشاعر خاطئة.')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('ماذا حدث؟ وماذا أحتاج الآن؟')).toBeInTheDocument();
  });
});

describe('CheckinPage', () => {
  it('shows an Arabic message and saves nothing when no emotion is chosen', async () => {
    const { repo, user } = setup();
    await user.click(screen.getByRole('button', { name: 'حفظ' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('أختار شعورًا واحدًا على الأقل');
    expect(await repo.listCheckins(wholeRange)).toHaveLength(0);
  });

  it('saves several emotions, a tag, a note and the next-session flag', async () => {
    const { repo, user } = setup();
    await user.click(screen.getByRole('button', { name: 'خجل' }));
    await user.click(screen.getByRole('button', { name: 'قلق' }));
    await user.click(screen.getByRole('button', { name: 'العمل' }));
    await user.type(screen.getByLabelText('ملاحظة قصيرة'), 'يوم طويل');
    await user.click(screen.getByLabelText('للنقاش في الجلسة القادمة'));
    await user.click(screen.getByRole('button', { name: 'حفظ' }));

    const [saved] = await repo.listCheckins(wholeRange);
    expect(saved.emotions.sort()).toEqual(['anxiety', 'shame']);
    expect(saved.tags).toEqual(['العمل']);
    expect(saved.note).toBe('يوم طويل');
    expect(saved.forNextSession).toBe(true);
    expect(saved.intensity).toBe(5);
  });
});
