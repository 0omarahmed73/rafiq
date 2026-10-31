import { useEffect, useRef, useState } from 'react';
import { ProgressSegments } from '../../components/ProgressSegments';
import { Switch } from '../../components/Switch';
import type { PracticeDef, Prompt } from '../../content/schema';
import { newId } from '../../db/repo';
import { useRepo } from '../../db/RepoContext';
import type { PracticeRecord } from '../../db/schema';
import { applySink, nextPromptId, POSITION_KEY, previousPromptId, visiblePrompts, type Answers } from './engine';
import { ChipsPrompt } from './prompts/ChipsPrompt';
import { ChoicePrompt } from './prompts/ChoicePrompt';
import { EmotionPrompt } from './prompts/EmotionPrompt';
import { ListPrompt } from './prompts/ListPrompt';
import { ScalePrompt } from './prompts/ScalePrompt';
import { SummaryPrompt } from './prompts/SummaryPrompt';
import { TextPrompt } from './prompts/TextPrompt';
import type { PromptProps } from './prompts/types';

const FINISH = '__finish';

const COMPONENTS: Record<Prompt['kind'], (p: PromptProps) => JSX.Element> = {
  text: TextPrompt,
  chips: ChipsPrompt,
  scale: ScalePrompt,
  choice: ChoicePrompt,
  list: ListPrompt,
  emotion: EmotionPrompt,
  summary: SummaryPrompt,
};

const navButton = 'min-h-12 rounded-full px-6 text-[15px] font-bold';

export function PracticeRunner({
  def,
  onFinished,
}: {
  def: PracticeDef;
  onFinished: (record: PracticeRecord) => void;
}) {
  const repo = useRepo();
  const [ready, setReady] = useState(false);
  const [answers, setAnswers] = useState<Answers>({});
  const [position, setPosition] = useState(def.prompts[0].id);
  const [forNextSession, setForNextSession] = useState(false);
  const [share, setShare] = useState(false);

  const meta = useRef({ id: newId(), startedAt: new Date().toISOString() });
  const dirty = useRef(false);
  const finished = useRef(false);
  const latest = useRef({ answers, position });
  latest.current = { answers, position };

  // Resume an unfinished draft of this practice, if there is one.
  useEffect(() => {
    let alive = true;
    void repo.getDraft(def.id).then((draft) => {
      if (!alive) return;
      if (draft) {
        meta.current = { id: draft.id, startedAt: draft.startedAt };
        const { [POSITION_KEY]: saved, ...rest } = draft.answers;
        setAnswers(rest);
        if (typeof saved === 'string') setPosition(saved);
      }
      setReady(true);
    });
    return () => {
      alive = false;
    };
  }, [repo, def.id]);

  function persistDraft() {
    if (finished.current) return;
    const { answers: a, position: at } = latest.current;
    void repo.savePractice({
      id: meta.current.id,
      practiceId: def.id,
      stepId: def.stepId,
      startedAt: meta.current.startedAt,
      answers: { ...a, [POSITION_KEY]: at },
      share: false,
      forNextSession: false,
    });
  }
  const persistRef = useRef(persistDraft);
  persistRef.current = persistDraft;

  // Autosave shortly after each change, and once more when the screen closes.
  useEffect(() => {
    if (!ready || !dirty.current) return;
    const timer = setTimeout(() => persistRef.current(), 300);
    return () => clearTimeout(timer);
  }, [answers, position, ready]);
  useEffect(
    () => () => {
      if (dirty.current) persistRef.current();
    },
    [],
  );

  const setAnswer = (id: string, value: unknown) => {
    dirty.current = true;
    setAnswers((a) => ({ ...a, [id]: value }));
  };
  const goTo = (id: string) => {
    dirty.current = true;
    setPosition(id);
  };

  if (!ready) return null;

  const visible = visiblePrompts(def, answers);

  async function finish() {
    finished.current = true;
    const shown = new Set(visible.map((p) => p.id));
    const record: PracticeRecord = {
      id: meta.current.id,
      practiceId: def.id,
      stepId: def.stepId,
      startedAt: meta.current.startedAt,
      completedAt: new Date().toISOString(),
      answers: Object.fromEntries(Object.entries(answers).filter(([id]) => shown.has(id))),
      share,
      forNextSession,
      updatedAt: '',
    };
    await repo.savePractice(record);
    await applySink(repo, def, record);
    onFinished(record);
  }

  if (position === FINISH) {
    const last = visible[visible.length - 1];
    return (
      <div className="flex flex-col gap-5">
        <h1 className="text-2xl font-bold leading-snug">قبل أن تنتهي</h1>
        <p className="text-[15px] leading-8 text-ink">
          ما كتبته خاص بك. يمكنك أن تختار هنا ما يصل إلى معالجك.
        </p>
        <Switch label="للنقاش في الجلسة القادمة" checked={forNextSession} onChange={setForNextSession} />
        <Switch label="مشاركة مع معالجي" checked={share} onChange={setShare} />
        <div className="flex gap-2.5">
          <button
            type="button"
            onClick={() => goTo(last.id)}
            className={`${navButton} flex-1 border-[1.5px] border-line bg-card text-ink`}
          >
            السابق
          </button>
          <button type="button" onClick={finish} className={`${navButton} flex-[2] bg-teal text-card`}>
            إنهاء التمرين
          </button>
        </div>
      </div>
    );
  }

  const prompt = def.prompts.find((p) => p.id === position) ?? def.prompts[0];
  const Component = COMPONENTS[prompt.kind];
  const index = visible.findIndex((p) => p.id === prompt.id);
  const previous = previousPromptId(def, answers, prompt.id);
  const next = nextPromptId(def, answers, prompt.id);

  return (
    <div className="flex flex-col gap-4">
      <ProgressSegments total={visible.length} current={index + 1} />
      <h1 className="text-2xl font-bold leading-snug">{prompt.label}</h1>
      {prompt.hint && prompt.kind !== 'summary' && (
        <p className="text-[15px] leading-8 text-muted">{prompt.hint}</p>
      )}
      <Component prompt={prompt} value={answers[prompt.id]} onChange={(v) => setAnswer(prompt.id, v)} />
      {prompt.example && (
        <section className="rounded-2xl border border-dashed border-line bg-card p-3.5">
          <div className="mb-1 text-xs font-semibold text-muted">مثال</div>
          <p className="text-sm leading-7">{prompt.example}</p>
        </section>
      )}
      <div className="flex gap-2.5 pt-2">
        {previous && (
          <button
            type="button"
            onClick={() => goTo(previous)}
            className={`${navButton} flex-1 border-[1.5px] border-line bg-card text-ink`}
          >
            السابق
          </button>
        )}
        <button
          type="button"
          onClick={() => goTo(next ?? FINISH)}
          className={`${navButton} flex-[2] bg-teal text-card`}
        >
          التالي
        </button>
      </div>
    </div>
  );
}
