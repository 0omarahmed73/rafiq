import { readinessQuestions } from './readiness';

describe('readinessQuestions', () => {
  it('has exactly three non-empty statements for each of the ten steps', () => {
    for (let id = 1; id <= 10; id++) {
      const questions = readinessQuestions[id];
      expect(questions, `step ${id}`).toHaveLength(3);
      for (const q of questions) expect(q.trim().length).toBeGreaterThan(0);
    }
  });

  it('has no duplicate statement within a step', () => {
    for (let id = 1; id <= 10; id++) {
      expect(new Set(readinessQuestions[id]).size).toBe(3);
    }
  });

  it('uses the therapist-aligned wording for step 2', () => {
    expect(readinessQuestions[2]).toEqual([
      'أفرّق بين الحاجة والرغبة والتفضيل.',
      'أكون مع عيب لي دون كراهية.',
      'أعرف ما أُبقيه وما أغيّره.',
    ]);
  });
});
