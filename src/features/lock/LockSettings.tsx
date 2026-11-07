import { useEffect, useState, type FormEvent } from "react";
import { Switch } from "../../components/Switch";
import type { Bi } from "../../i18n";
import { useI18n } from "../../i18n/LanguageProvider";
import {
  isBiometricAvailable,
  verifyBiometric,
} from "../../platform/biometric";
import { useLock } from "./LockProvider";
import { AUTO_LOCK_OPTIONS, DEFAULT_AUTO_LOCK_MS, readLock } from "./lockStore";
import {
  BackButton,
  RANGE_ERROR,
  WaitStatus,
  card,
  errorText,
  field,
  primary,
  secondary,
} from "./lockUi";
import { isValidPin, isWeakPin, normalizeDigits } from "./pin";

type Mode = "setup" | "change";
type Step =
  | { kind: "idle" }
  | { kind: "choose"; mode: Mode }
  | { kind: "confirm"; mode: Mode }
  | { kind: "showCode"; mode: Mode }
  | { kind: "askPin"; action: "change" | "off" };

const IDLE: Step = { kind: "idle" };

const SAVE_FAILED: Bi = {
  ar: "تعذّر حفظ القفل على هذا الجهاز",
  en: "The lock could not be saved on this device",
};
const BIOMETRIC_LABEL: Bi = {
  ar: "استخدم البصمة أيضًا",
  en: "Also use biometrics",
};
const BIOMETRIC_FAILED: Bi = {
  ar: "لم أتحقق بالبصمة، فبقيت متوقفة",
  en: "My biometrics were not confirmed, so they stay off",
};
const BIOMETRIC_REASON: Bi = {
  ar: "تأكيد البصمة لرفيق",
  en: "Confirm biometrics for Rafiq",
};

const AUTO_LOCK_LABELS: Record<number, { text: Bi; n?: number }> = {
  0: { text: { ar: "فورًا", en: "Immediately" } },
  60000: { text: { ar: "دقيقة واحدة", en: "1 minute" } },
  300000: { text: { ar: "{n} دقائق", en: "{n} minutes" }, n: 5 },
  900000: { text: { ar: "{n} دقيقة", en: "{n} minutes" }, n: 15 },
};

/** The Settings card for the optional PIN lock: set up, auto-lock time, biometrics, change PIN, turn off. */
export function LockSettings() {
  const { t } = useI18n();
  const lock = useLock();
  const [step, setStepState] = useState<Step>(IDLE);
  const [pin, setPin] = useState("");
  const [again, setAgain] = useState("");
  const [current, setCurrent] = useState("");
  const [code, setCode] = useState("");
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [useBio, setUseBio] = useState(false);
  const [bioAvailable, setBioAvailable] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let live = true;
    void isBiometricAvailable().then((available) => {
      if (live) setBioAvailable(available);
    });
    return () => {
      live = false;
    };
  }, []);

  /** Moves to another step and forgets everything typed so far. */
  function go(next: Step) {
    setStepState(next);
    setPin("");
    setAgain("");
    setCurrent("");
    setError(null);
    setStatus(null);
    if (next.kind !== "showCode") {
      setCode("");
      setSaved(false);
      setCopied(false);
    }
    if (next.kind === "idle") setUseBio(false);
  }

  async function confirmBiometric(): Promise<boolean> {
    const ok = await verifyBiometric(t(BIOMETRIC_REASON));
    setStatus(ok ? null : t(BIOMETRIC_FAILED));
    return ok;
  }

  async function chooseSetupBiometric(next: boolean) {
    if (!next) {
      setUseBio(false);
      setStatus(null);
      return;
    }
    setUseBio(await confirmBiometric());
  }

  async function toggleBiometric(next: boolean) {
    setError(null);
    if (next && !(await confirmBiometric())) return;
    if (!next) setStatus(null);
    lock.setBiometric(next);
    if (readLock()?.biometric !== next) setError(t(SAVE_FAILED));
  }

  function chooseAutoLock(ms: number) {
    setError(null);
    lock.setAutoLockMs(ms);
    if (readLock()?.autoLockMs !== ms) setError(t(SAVE_FAILED));
  }

  function submitChoice(event: FormEvent, mode: Mode) {
    event.preventDefault();
    setError(null);
    if (!isValidPin(pin)) return setError(t(RANGE_ERROR));
    if (isWeakPin(pin)) {
      return setError(
        t({
          ar: "هذا الرمز سهل التخمين. أختار رمزًا آخر.",
          en: "This PIN is easy to guess. I will choose another one.",
        }),
      );
    }
    setStepState({ kind: "confirm", mode });
  }

  async function submitConfirm(event: FormEvent, mode: Mode) {
    event.preventDefault();
    if (busy) return;
    setError(null);
    if (again !== pin) {
      setAgain("");
      return setError(
        t({ ar: "الرمزان غير متطابقين", en: "The two PINs do not match" }),
      );
    }
    setBusy(true);
    try {
      const next =
        mode === "setup"
          ? await lock.setUp(pin, useBio)
          : await lock.changePin(pin);
      go({ kind: "showCode", mode });
      setCode(next);
    } catch {
      if (mode === "setup") go(IDLE);
      else setAgain("");
      setError(t(SAVE_FAILED));
    } finally {
      setBusy(false);
    }
  }

  async function submitCurrent(event: FormEvent, action: "change" | "off") {
    event.preventDefault();
    if (busy || lock.waitMs > 0) return;
    setError(null);
    setBusy(true);
    const result = await lock.verifyPin(current);
    setBusy(false);
    setCurrent("");
    if (result === "ok") {
      if (action === "change") {
        go({ kind: "choose", mode: "change" });
      } else {
        lock.turnOff();
        go(IDLE);
        setStatus(t({ ar: "أوقفت القفل.", en: "I turned off the lock." }));
      }
    } else if (result === "wrong") {
      setError(t({ ar: "الرمز غير صحيح", en: "That PIN is not right" }));
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
    } catch {
      // clipboard unavailable: the code stays on screen to write down
    }
  }

  const alert = error && (
    <p role="alert" className={errorText}>
      {error}
    </p>
  );
  // Rendered only with a message, like the other Settings cards, so the page has no empty status regions.
  const statusLine = status && (
    <p role="status" className="text-sm font-semibold text-ink">
      {status}
    </p>
  );
  const honest = (
    <p className="text-sm leading-7 text-muted">
      {t({
        ar: "القفل يخفي التطبيق لكنه لا يشفّر بياناتي على هذا الجهاز",
        en: "The lock hides the app but does not encrypt my data on this device",
      })}
    </p>
  );

  function body() {
    if (step.kind === "showCode") {
      return (
        <>
          <h3 className="text-[15px] font-bold">
            {step.mode === "setup"
              ? t({ ar: "رمز الاسترداد", en: "My recovery code" })
              : t({ ar: "رمز الاسترداد الجديد", en: "My new recovery code" })}
          </h3>
          <p className="text-sm leading-7 text-muted">
            {step.mode === "setup"
              ? t({
                  ar: "أكتب رمز الاسترداد هذا وأحفظه في مكان آمن خارج الهاتف. أحتاجه لاختيار رمز جديد إن نسيت رمزي، ولن يظهر مرة أخرى.",
                  en: "I write this recovery code down and keep it somewhere safe off this phone. I need it to choose a new PIN if I forget mine, and it will not be shown again.",
                })
              : t({
                  ar: "غيّرت رمزي. أكتب رمز الاسترداد الجديد وأحفظه في مكان آمن خارج الهاتف. الرمز القديم لم يعد يعمل، ولن يظهر هذا الرمز مرة أخرى.",
                  en: "My PIN is changed. I write this new recovery code down and keep it somewhere safe off this phone. The old code no longer works, and this one will not be shown again.",
                })}
          </p>
          <p
            data-testid="recovery-code"
            dir="ltr"
            className="break-all text-center font-mono text-2xl font-bold tracking-widest"
          >
            {code}
          </p>
          <button
            type="button"
            onClick={() => void copy()}
            className={secondary}
          >
            {t({ ar: "نسخ", en: "Copy" })}
          </button>
          <p role="status" className="min-h-6 text-sm font-semibold text-ink">
            {copied ? t({ ar: "نسخت الرمز.", en: "I copied the code." }) : null}
          </p>
          <label className="flex min-h-11 cursor-pointer items-center gap-2.5 text-[15px] font-semibold">
            <input
              type="checkbox"
              checked={saved}
              onChange={(e) => setSaved(e.target.checked)}
              className="h-5 w-5"
            />
            {t({ ar: "حفظت رمز الاسترداد", en: "I saved it" })}
          </label>
          <button
            type="button"
            disabled={!saved}
            onClick={() => go(IDLE)}
            className={primary}
          >
            {t({ ar: "تم", en: "Done" })}
          </button>
        </>
      );
    }

    if (step.kind === "choose") {
      const { mode } = step;
      return (
        <form
          onSubmit={(e) => submitChoice(e, mode)}
          noValidate
          className="flex flex-col gap-3"
        >
          <h3 className="text-[15px] font-bold">
            {mode === "setup"
              ? t({
                  ar: "أختار رمزًا للقفل",
                  en: "I choose a PIN for the lock",
                })
              : t({ ar: "أختار رمزًا جديدًا", en: "I choose a new PIN" })}
          </h3>
          <p className="text-sm leading-7 text-muted">
            {t({
              ar: "من ٤ إلى ٦ أرقام، وليس رمزًا سهلًا مثل ١١١١ أو ١٢٣٤.",
              en: "4 to 6 digits, and not an easy one like 1111 or 1234.",
            })}
          </p>
          <PinField
            id="lock-new-pin"
            label={t({ ar: "الرمز الجديد", en: "New PIN" })}
            value={pin}
            onChange={setPin}
          />
          {mode === "setup" && bioAvailable && (
            <label className="flex min-h-11 cursor-pointer items-center gap-2.5 text-[15px] font-semibold">
              <input
                type="checkbox"
                checked={useBio}
                onChange={(e) => void chooseSetupBiometric(e.target.checked)}
                className="h-5 w-5"
              />
              {t(BIOMETRIC_LABEL)}
            </label>
          )}
          {statusLine}
          {alert}
          <button type="submit" className={primary}>
            {t({ ar: "التالي", en: "Next" })}
          </button>
          <BackButton onBack={() => go(IDLE)} />
        </form>
      );
    }

    if (step.kind === "confirm") {
      const { mode } = step;
      return (
        <form
          onSubmit={(e) => void submitConfirm(e, mode)}
          noValidate
          className="flex flex-col gap-3"
        >
          <h3 className="text-[15px] font-bold">
            {t({
              ar: "أعيد كتابة الرمز للتأكيد",
              en: "I enter the PIN again to confirm",
            })}
          </h3>
          <PinField
            id="lock-new-pin-again"
            label={t({ ar: "أعيد كتابة الرمز", en: "PIN again" })}
            value={again}
            onChange={setAgain}
          />
          {alert}
          <button type="submit" disabled={busy} className={primary}>
            {t({ ar: "احفظ الرمز", en: "Save the PIN" })}
          </button>
          <BackButton onBack={() => go({ kind: "choose", mode })} />
        </form>
      );
    }

    if (step.kind === "askPin") {
      const { action } = step;
      const blocked = lock.waitMs > 0;
      return (
        <form
          onSubmit={(e) => void submitCurrent(e, action)}
          noValidate
          className="flex flex-col gap-3"
        >
          <h3 className="text-[15px] font-bold">
            {action === "off"
              ? t({
                  ar: "أكتب رمزي الحالي لإيقاف القفل",
                  en: "I enter my current PIN to turn off the lock",
                })
              : t({
                  ar: "أكتب رمزي الحالي لتغييره",
                  en: "I enter my current PIN to change it",
                })}
          </h3>
          {action === "off" && (
            <p className="text-sm leading-7 text-muted">
              {t({
                ar: "إيقاف القفل يحذف الرمز ورمز الاسترداد من هذا الجهاز.",
                en: "Turning off the lock deletes the PIN and the recovery code from this device.",
              })}
            </p>
          )}
          <PinField
            id="lock-current-pin"
            label={t({ ar: "الرمز الحالي", en: "Current PIN" })}
            value={current}
            onChange={setCurrent}
            current
          />
          {alert}
          <WaitStatus waitMs={lock.waitMs} />
          <button type="submit" disabled={busy || blocked} className={primary}>
            {t({ ar: "متابعة", en: "Continue" })}
          </button>
          <BackButton onBack={() => go(IDLE)} />
        </form>
      );
    }

    if (!lock.enabled) {
      return (
        <>
          {honest}
          {statusLine}
          {alert}
          <button
            type="button"
            onClick={() => go({ kind: "choose", mode: "setup" })}
            className={primary}
          >
            {t({ ar: "تفعيل القفل", en: "Turn on the lock" })}
          </button>
        </>
      );
    }

    const autoLockMs = lock.record?.autoLockMs ?? DEFAULT_AUTO_LOCK_MS;
    return (
      <>
        <p className="text-sm font-semibold">
          {t({
            ar: "القفل مفعّل. أحتاج رمزي لفتح التطبيق.",
            en: "The lock is on. I need my PIN to open the app.",
          })}
        </p>
        {honest}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="lock-auto" className="text-[15px] font-semibold">
            {t({
              ar: "أقفل التطبيق بعد مغادرته",
              en: "Lock the app after I leave it",
            })}
          </label>
          <select
            id="lock-auto"
            value={String(autoLockMs)}
            onChange={(e) => chooseAutoLock(Number(e.target.value))}
            className={field}
          >
            {AUTO_LOCK_OPTIONS.map((ms) => {
              const label = AUTO_LOCK_LABELS[ms];
              return (
                <option key={ms} value={String(ms)}>
                  {label.n === undefined
                    ? t(label.text)
                    : t(label.text, { n: label.n })}
                </option>
              );
            })}
          </select>
        </div>
        {bioAvailable && (
          <Switch
            label={t(BIOMETRIC_LABEL)}
            checked={lock.record?.biometric ?? false}
            onChange={(next) => void toggleBiometric(next)}
          />
        )}
        {statusLine}
        {alert}
        <button
          type="button"
          onClick={() => go({ kind: "askPin", action: "change" })}
          className={secondary}
        >
          {t({ ar: "غيّر الرمز", en: "Change the PIN" })}
        </button>
        <button
          type="button"
          onClick={() => go({ kind: "askPin", action: "off" })}
          className={secondary}
        >
          {t({ ar: "أوقف القفل", en: "Turn off the lock" })}
        </button>
      </>
    );
  }

  return (
    <section className={card} aria-labelledby="lock-title">
      <h2 id="lock-title" className="text-base font-bold">
        {t({ ar: "القفل", en: "Lock" })}
      </h2>
      {lock.resetNotice && (
        <p className="text-sm font-semibold text-teal-ink">
          {t({
            ar: "أُعيد ضبط القفل لأن بياناته تالفة",
            en: "The lock was reset because its data was damaged",
          })}
        </p>
      )}
      {body()}
    </section>
  );
}

function PinField({
  id,
  label,
  value,
  onChange,
  current = false,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (next: string) => void;
  current?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[15px] font-semibold">
        {label}
      </label>
      <input
        id={id}
        type="password"
        inputMode="numeric"
        autoComplete={current ? "off" : "new-password"}
        maxLength={6}
        dir="ltr"
        value={value}
        onChange={(e) => onChange(normalizeDigits(e.target.value))}
        className={field}
      />
    </div>
  );
}
