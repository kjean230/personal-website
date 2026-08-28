/**
 * lib/render/dates.ts — every date the site renders passes through here (S6).
 *
 * `entries.start_date` / `end_date` are always full ISO dates, but only part of
 * one is real: `metadata.date_precision` says how much (S3 — the LinkedIn
 * export gives months, so the day is a placeholder "01"). Formatting therefore
 * has one rule that matters more than the rest: **never show a day the data
 * does not have.** A month-precision row renders "May 2026", and its
 * `<time datetime>` is "2026-05" — not "2026-05-01", which would assert a
 * first-of-the-month that nobody recorded.
 *
 * No `Date` objects anywhere. A `Date` built from "2026-05-01" is UTC midnight,
 * which formats as the previous day west of Greenwich, and `Intl` output varies
 * with the runtime's ICU build — either would make the server and the browser
 * disagree on a prerendered page. Slicing the ISO string cannot.
 */

import type { DatePrecision } from "../content/schema";

/** Index 0 = January. `Intl` is deliberately not used — see the file header. */
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

/** One rendered date: the `<time datetime>` value and the text beside it. */
export interface DatePoint {
  /** Precision-appropriate: `2026-05-01`, `2026-05` or `2026`. Valid HTML in all three shapes. */
  readonly datetime: string;
  /** `May 1, 2026`, `May 2026` or `2026`. */
  readonly text: string;
}

/** A range to render. `present` is text ("Present"), never a `<time>` — it has no date. */
export interface DateRange {
  readonly start: DatePoint | null;
  readonly end: DatePoint | null;
  /** `is_current`: the range runs to today, so it ends in "Present" rather than a date. */
  readonly present: boolean;
}

/** The fields a range needs; both `Entry` and `EntrySummary` satisfy it structurally. */
export interface DatedEntry {
  readonly start_date: string | null;
  readonly end_date: string | null;
  readonly is_current: boolean;
  readonly metadata: { readonly date_precision?: DatePrecision };
}

/**
 * Formats one ISO date at its recorded precision. An absent precision means
 * the whole date is real — only the S2 fixture rows omit it; every one of the
 * real content rows carries one.
 * @returns the `<time datetime>` value and its text.
 */
export function formatDate(iso: string, precision?: DatePrecision): DatePoint {
  const year = iso.slice(0, 4);
  if (precision === "year") return { datetime: year, text: year };

  const month = iso.slice(5, 7);
  const monthName = MONTHS[Number(month) - 1] ?? month;
  if (precision === "month") return { datetime: `${year}-${month}`, text: `${monthName} ${year}` };

  const day = iso.slice(8, 10);
  return { datetime: `${year}-${month}-${day}`, text: `${monthName} ${Number(day)}, ${year}` };
}

/**
 * The range one entry renders: start, end, and whether it runs to "Present".
 * `is_current` wins over `end_date` — a current row shows "Present" even if a
 * provisional end date was recorded.
 * @returns the range, or `null` when the entry has no dates at all and there is nothing to show.
 */
export function entryDateRange(entry: DatedEntry): DateRange | null {
  const precision = entry.metadata.date_precision;
  const start = entry.start_date === null ? null : formatDate(entry.start_date, precision);
  const present = entry.is_current;
  const end = present || entry.end_date === null ? null : formatDate(entry.end_date, precision);
  if (start === null && end === null && !present) return null;
  return { start, end, present };
}
