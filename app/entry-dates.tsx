import { entryDateRange, type DatedEntry } from "@/lib/render/dates";
import styles from "./site.module.css";

// The one place a date range becomes markup — the section index, the entry
// page and the resume all render it, and all three must agree that a
// month-precision row emits `<time datetime="2026-05">` and never a day the
// data does not have (lib/render/dates.ts owns that rule). Not a route file:
// only page.tsx / layout.tsx are routes, so this sits beside site.module.css
// as a shared piece of the recruiter render.

interface EntryDatesProps {
  readonly entry: DatedEntry;
  /** `metadata.location`, when the entry has one. Rendered after the dates; the entry page is its only home. */
  readonly location?: string;
  readonly className?: string;
}

/**
 * The dates line: `May 2026 – Present`, `May 2026 – August 2026`, or a single
 * date, optionally followed by the location.
 * @returns the line, or `null` when the entry has neither dates nor a location.
 */
export function EntryDates({ entry, location, className }: EntryDatesProps) {
  const range = entryDateRange(entry);
  const start = range?.start ? <time dateTime={range.start.datetime}>{range.start.text}</time> : null;
  const end = range?.present ? (
    "Present"
  ) : range?.end ? (
    <time dateTime={range.end.datetime}>{range.end.text}</time>
  ) : null;

  if (!start && !end && !location) return null;
  return (
    <p className={className ?? styles.dates}>
      {start}
      {start && end ? " – " : null}
      {end}
      {location ? (
        <>
          {start || end ? " · " : null}
          {location}
        </>
      ) : null}
    </p>
  );
}
