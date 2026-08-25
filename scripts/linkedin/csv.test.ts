import { describe, expect, it } from "vitest";
import { parseCsv, parseCsvRecords } from "./csv.mjs";

describe("parseCsv", () => {
  it("splits fields and records", () => {
    expect(parseCsv("a,b,c\n1,2,3\n")).toEqual([
      ["a", "b", "c"],
      ["1", "2", "3"],
    ]);
  });

  it("handles quoted fields, doubled quotes, commas and newlines inside quotes", () => {
    const text = 'Title,Description\n"Hello, world","She said ""hi""\nsecond line"\n';
    expect(parseCsv(text)).toEqual([
      ["Title", "Description"],
      ["Hello, world", 'She said "hi"\nsecond line'],
    ]);
  });

  it("accepts CRLF and CR record separators and a leading BOM", () => {
    expect(parseCsv("﻿a,b\r\n1,2\r\n")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
    expect(parseCsv("a,b\r1,2")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });

  it("keeps empty fields and drops blank lines", () => {
    expect(parseCsv("a,b,c\n1,,\n\n,,3\n")).toEqual([
      ["a", "b", "c"],
      ["1", "", ""],
      ["", "", "3"],
    ]);
  });

  it("throws on an unterminated quote", () => {
    expect(() => parseCsv('a\n"open')).toThrow(/unterminated/);
  });
});

describe("parseCsvRecords", () => {
  it("keys fields by trimmed header", () => {
    expect(parseCsvRecords("Company Name , Title\nAcme,Engineer\n")).toEqual([
      { "Company Name": "Acme", Title: "Engineer" },
    ]);
  });

  it("returns nothing for a header-only file", () => {
    expect(parseCsvRecords("Name\n")).toEqual([]);
    expect(parseCsvRecords("")).toEqual([]);
  });

  it("throws on a ragged record, naming it", () => {
    expect(() => parseCsvRecords("a,b\n1,2\n3\n")).toThrow(/record 3 has 1 fields, header has 2/);
  });
});
