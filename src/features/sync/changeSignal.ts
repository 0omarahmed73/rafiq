import type { Repo } from '../../db/repo';

export const MUTATING_METHODS = [
  'addCheckin',
  'savePractice',
  'deletePractice',
  'saveHomework',
  'deleteHomework',
  'saveHomeworkImage',
  'deleteHomeworkImage',
  'saveNote',
  'deleteNote',
  'archiveNotes',
  'addFollowup',
  'addLetter',
  'saveWeeklyReview',
  'saveSession',
  'saveStepProgress',
  'addSoothing',
  'removeSoothing',
  'saveSettings',
  'saveAgendaPoint',
  'deleteAgendaPoint',
  'saveYearPlanEntry',
  'replaceAll',
  'mergeAll',
  'eraseAll',
] as const satisfies readonly (keyof Repo)[];

export const READING_METHODS = [
  'listCheckins',
  'getDraft',
  'listPractices',
  'getHomework',
  'listHomework',
  'listHomeworkBySession',
  'listHomeworkImages',
  'countHomeworkImages',
  'listNotes',
  'listFollowups',
  'listLetters',
  'listWeeklyReviews',
  'listSessions',
  'getStepProgress',
  'listSoothing',
  'getSettings',
  'listAgendaPoints',
  'listYearPlan',
  'exportAll',
] as const satisfies readonly (keyof Repo)[];

const mutatingMethods = new Set<string>(MUTATING_METHODS);

export function withChangeSignal(repo: Repo, onChange: () => void): Repo {
  return new Proxy(repo, {
    get(target, property, receiver) {
      const method = Reflect.get(target, property, receiver);
      if (typeof property !== 'string' || !mutatingMethods.has(property) || typeof method !== 'function') return method;

      return (...args: unknown[]) =>
        Promise.resolve(method.apply(target, args)).then((result: unknown) => {
          onChange();
          return result;
        });
    },
  });
}
