import { dayKey } from '../../lib/dates';
import type { Repo } from '../../db/repo';
import type { Checkin } from '../../db/schema';

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export interface CheckinInput {
  emotions: string[];
  intensity: number;
  tags?: string[];
  note?: string;
  forNextSession?: boolean;
  stepId?: number;
}

/** Validates and stores a check-in, filed under the local day of `now`. */
export async function saveCheckin(
  repo: Repo,
  input: CheckinInput,
  now: Date = new Date(),
): Promise<Checkin> {
  if (input.emotions.length === 0) throw new ValidationError('أختار شعورًا واحدًا على الأقل');
  if (!Number.isInteger(input.intensity) || input.intensity < 0 || input.intensity > 10) {
    throw new ValidationError('الشدّة رقم صحيح من صفر إلى عشرة');
  }
  const note = input.note?.trim();
  return repo.addCheckin({
    at: now.toISOString(),
    day: dayKey(now),
    emotions: input.emotions,
    intensity: input.intensity,
    tags: input.tags ?? [],
    ...(note ? { note } : {}),
    forNextSession: input.forNextSession ?? false,
    ...(input.stepId !== undefined ? { stepId: input.stepId } : {}),
  });
}
