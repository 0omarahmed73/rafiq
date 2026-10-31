import type { PracticeDef, Prompt } from '../../content/schema';
import type { Repo } from '../../db/repo';
import type { Letter, PracticeRecord } from '../../db/schema';

/** Answers by prompt id. Shapes: text `Record<fieldId,string>`, chips `{values,text?}`, choice `{value,text?}`,
 *  scale `number`, list `string[]`, emotion `{id,intensity}[]`. */
export type Answers = Record<string, unknown>;

/** Reserved key in a saved draft's answers: where the user stopped. */
export const POSITION_KEY = '_position';

function matches(answer: unknown, equals: string): boolean {
  if (typeof answer === 'string') return answer === equals;
  if (answer && typeof answer === 'object') {
    const a = answer as { value?: unknown; values?: unknown };
    if (typeof a.value === 'string') return a.value === equals;
    if (Array.isArray(a.values)) return a.values.includes(equals);
  }
  return false;
}

function isVisible(p: Prompt, answers: Answers): boolean {
  return !p.showWhen || matches(answers[p.showWhen.promptId], p.showWhen.equals);
}

export function visiblePrompts(def: PracticeDef, answers: Answers): Prompt[] {
  return def.prompts.filter((p) => isVisible(p, answers));
}

/** The next visible prompt after `currentId`, or null after the last one. */
export function nextPromptId(def: PracticeDef, answers: Answers, currentId: string): string | null {
  const at = def.prompts.findIndex((p) => p.id === currentId);
  for (let i = at + 1; i < def.prompts.length; i++) {
    if (isVisible(def.prompts[i], answers)) return def.prompts[i].id;
  }
  return null;
}

/** The previous visible prompt before `currentId`, or null at the first one. */
export function previousPromptId(def: PracticeDef, answers: Answers, currentId: string): string | null {
  const at = def.prompts.findIndex((p) => p.id === currentId);
  for (let i = at - 1; i >= 0; i--) {
    if (isVisible(def.prompts[i], answers)) return def.prompts[i].id;
  }
  return null;
}

function firstText(def: PracticeDef, answers: Answers): string {
  const prompt = def.prompts.find((p) => p.kind === 'text');
  const value = prompt ? answers[prompt.id] : undefined;
  if (!value || typeof value !== 'object') return '';
  const fields = value as Record<string, unknown>;
  if (typeof fields.text === 'string') return fields.text.trim();
  return Object.values(fields)
    .filter((v): v is string => typeof v === 'string')
    .join('\n')
    .trim();
}

/**
 * Stores a follow-up against the latest completed `regulation` record. Nothing is stored when
 * there is no such record or the user did not say whether it helped (no guessing).
 */
async function saveFollowup(repo: Repo, record: PracticeRecord): Promise<void> {
  const answers = record.answers;
  const helped = (answers['helped'] as { value?: string } | undefined)?.value;
  if (helped !== 'much' && helped !== 'little' && helped !== 'no') return;

  const regulations = (await repo.listPractices())
    .filter((p) => p.practiceId === 'regulation' && p.completedAt && p.id !== record.id)
    .sort((a, b) => (a.completedAt ?? '').localeCompare(b.completedAt ?? ''));
  const latest = regulations[regulations.length - 1];
  if (!latest) return;

  const feelings = Array.isArray(latest.answers['feelings'])
    ? (latest.answers['feelings'] as { intensity: number }[])
    : [];
  const tried = answers['tried'] as { values?: string[]; text?: string } | undefined;
  const typed = tried?.text?.trim();
  const note = (answers['noticed'] as { text?: string } | undefined)?.text?.trim();

  await repo.addFollowup({
    practiceRecordId: latest.id,
    tried: [...(tried?.values ?? []), ...(typed ? [typed] : [])],
    helped,
    intensityBefore: feelings.length ? Math.max(...feelings.map((f) => f.intensity)) : 0,
    intensityAfter: typeof answers['intensityAfter'] === 'number' ? answers['intensityAfter'] : 5,
    ...(note ? { note } : {}),
    at: record.completedAt ?? new Date().toISOString(),
  });
}

/** Runs the side effect a completed practice declares (a letter, the acceptance decision, a follow-up). */
export async function applySink(repo: Repo, def: PracticeDef, record: PracticeRecord): Promise<void> {
  if (!def.sink) return;
  if (def.sink === 'acceptDecision') {
    const choice = record.answers['a6'] as { value?: string } | undefined;
    if (choice?.value !== 'keep' && choice?.value !== 'change') return;
    const reasons = Array.isArray(record.answers['a7']) ? (record.answers['a7'] as string[]) : [];
    const progress = await repo.getStepProgress(def.stepId);
    await repo.saveStepProgress({ ...progress, decision: { acceptanceChoice: choice.value, reasons } });
    return;
  }
  if (def.sink === 'followup') {
    await saveFollowup(repo, record);
    return;
  }
  const text = firstText(def, record.answers);
  if (!text) return;
  await repo.addLetter({
    kind: def.sink.slice('letter:'.length) as Letter['kind'],
    text,
    at: record.completedAt ?? new Date().toISOString(),
    share: record.share,
  });
}
