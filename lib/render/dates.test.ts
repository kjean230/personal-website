import { describe, expect, it } from "vitest";
import { entryDateRange, formatDate, type DatedEntry } from "./dates";

// The seed stores every date as a full ISO date and records in
// `metadata.date_precision` how much of it is real (S3: LinkedIn gives months,
// so the day is the placeholder "01"). These tests pin the rule that follows
// from that — a month-precision row never renders a day, in the text or in the
// `<time datetime>` — plus the four shapes a range can take.

const entry = (overrides: Partial<DatedEntry>): DatedEntry => ({
  start_date: "2026-05-01",
  end_date: null,
  is_current: false,
  metadata: { date_precision: "month" },
  ...overrides,
});

describe("formatDate", () => {
  it("renders a day-precision date in full", () => {
    expect(formatDate("2026-05-01", "day")).toEqual({ datetime: "2026-05-01", text: "May 1, 2026" });
  });

  it("renders a month-precision date without the placeholder day", () => {
    expect(formatDate("2026-05-01", "month")).toEqual({ datetime: "2026-05", text: "May 2026" });
  });

  it("renders a year-precision date as the year alone", () => {
    expect(formatDate("2026-05-01", "year")).toEqual({ datetime: "2026", text: "2026" });
  });

  it("treats an absent precision as a full date, which is what the fixture rows are", () => {
    expect(formatDate("2026-05-01")).toEqual({ datetime: "2026-05-01", text: "May 1, 2026" });
  });

  it("drops the leading zero from the day but keeps it in the datetime", () => {
    expect(formatDate("2026-01-09", "day")).toEqual({ datetime: "2026-01-09", text: "January 9, 2026" });
  });

  it("reads the month from the string rather than a Date, so no timezone can shift it", () => {
    for (const [month, name] of [
      ["01", "January"],
      ["06", "June"],
      ["12", "December"],
    ] as const) {
      expect(formatDate(`2026-${month}-01`, "month").text).toBe(`${name} 2026`);
    }
  });
});

describe("entryDateRange", () => {
  it("ends a current entry in Present rather than a date", () => {
    expect(entryDateRange(entry({ is_current: true }))).toEqual({
      start: { datetime: "2026-05", text: "May 2026" },
      end: null,
      present: true,
    });
  });

  it("lets is_current win over a recorded end date", () => {
    expect(entryDateRange(entry({ end_date: "2026-08-01", is_current: true }))).toEqual({
      start: { datetime: "2026-05", text: "May 2026" },
      end: null,
      present: true,
    });
  });

  it("gives a start and an end when the entry is finished", () => {
    expect(entryDateRange(entry({ end_date: "2026-08-01" }))).toEqual({
      start: { datetime: "2026-05", text: "May 2026" },
      end: { datetime: "2026-08", text: "August 2026" },
      present: false,
    });
  });

  it("gives the start alone when there is no end and the entry is not current", () => {
    expect(entryDateRange(entry({}))).toEqual({
      start: { datetime: "2026-05", text: "May 2026" },
      end: null,
      present: false,
    });
  });

  it("gives the end alone when the start is unknown", () => {
    expect(entryDateRange(entry({ start_date: null, end_date: "2026-08-01" }))).toEqual({
      start: null,
      end: { datetime: "2026-08", text: "August 2026" },
      present: false,
    });
  });

  it("gives Present alone when a current entry has no start date", () => {
    expect(entryDateRange(entry({ start_date: null, is_current: true }))).toEqual({
      start: null,
      end: null,
      present: true,
    });
  });

  it("returns null when the entry has no dates to show at all", () => {
    expect(entryDateRange(entry({ start_date: null }))).toBeNull();
  });

  it("applies the entry's precision to both ends of the range", () => {
    expect(
      entryDateRange(
        entry({ end_date: "2027-05-01", metadata: { date_precision: "year" } }),
      ),
    ).toEqual({
      start: { datetime: "2026", text: "2026" },
      end: { datetime: "2027", text: "2027" },
      present: false,
    });
  });
});
