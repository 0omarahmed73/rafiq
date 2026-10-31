import type { Homework, Session } from './schema';

/**
 * Turns the old `session.homework` items (text and done only) into homework records. Ids are derived from the
 * session and the item's position, so converting the same session twice gives the same rows and never duplicates.
 */
export function legacyHomework(session: Session): Homework[] {
  return session.homework.flatMap((item, index) =>
    item.text.trim() === ''
      ? []
      : [
          {
            id: `legacy-${session.id}-${index}`,
            sessionId: session.id,
            text: item.text,
            done: item.done,
            createdAt: session.createdAt,
            updatedAt: session.updatedAt,
          },
        ],
  );
}
