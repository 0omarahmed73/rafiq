import type { Bi } from '../../i18n';

/** `draft` until the owner's therapist has read the text. Only then is it changed to `approved`, with `reviewedBy`. */
export type ReviewStatus = 'draft' | 'approved';

export type SourceKind = 'health-service' | 'research-institute' | 'peer-reviewed' | 'systematic-review' | 'manual';

/** Where a statement comes from. Shown to the reader as plain text, never as a link that leaves the app. */
export interface LibrarySource {
  id: string;
  /** Who published it, as written in the original language. */
  title: string;
  /** What it is, in a few words. */
  about: Bi;
  kind: SourceKind;
  /** Plain address, shown selectable. */
  address?: string;
  /** An honest limit of this source, shown with it. */
  limit?: Bi;
}

export interface Reviewable {
  sourceIds: string[];
  status: ReviewStatus;
  reviewedBy?: string;
}

export interface PageSection {
  id: string;
  heading: Bi;
  paragraphs: Bi[];
}

/** A reading page made of sections: «ما هو اضطراب…» and «الأمل والتعافي». */
export interface ReadingPage extends Reviewable {
  id: 'about' | 'hope';
  title: Bi;
  intro: Bi;
  sections: PageSection[];
}

/** An app tool the reader can open right now from a symptom page. */
export interface ToolLink {
  label: Bi;
  to: string;
}

export interface Symptom extends Reviewable {
  id: string;
  /** In kind words, never a label for the person. */
  title: Bi;
  summary: Bi;
  feels: Bi;
  need: Bi;
  /** Offered, never forced: the reader picks the one that fits, or none. */
  selfSentences: Bi[];
  tool: ToolLink;
  /** An extra caution shown below the card, when the source gives one. */
  note?: Bi;
  /** Symptoms about harm: the crisis page is shown first. */
  safety?: boolean;
}
