// @ts-check
// RFC 4180 CSV parser for the LinkedIn export (S3). Zero dependencies.
//
// Handles quoted fields, doubled-quote escapes, CR / LF / CRLF both between
// records and inside quoted fields, a leading UTF-8 BOM, and a trailing
// newline. A record whose field count differs from the header's throws with
// its record number: a silently misaligned column is worse than a failed
// import.

/**
 * Parses CSV text into records of fields. Blank lines are dropped.
 * @param {string} text
 * @returns {string[][]}
 */
export function parseCsv(text) {
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  /** @type {string[][]} */
  const records = [];
  /** @type {string[]} */
  let record = [];
  let field = "";
  let quoted = false;
  let i = 0;

  const endRecord = () => {
    record.push(field);
    field = "";
    if (!(record.length === 1 && record[0] === "")) records.push(record);
    record = [];
  };

  while (i < text.length) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
        } else {
          quoted = false;
          i += 1;
        }
      } else {
        field += ch;
        i += 1;
      }
      continue;
    }
    if (ch === '"' && field === "") {
      quoted = true;
      i += 1;
    } else if (ch === ",") {
      record.push(field);
      field = "";
      i += 1;
    } else if (ch === "\r" || ch === "\n") {
      endRecord();
      i += ch === "\r" && text[i + 1] === "\n" ? 2 : 1;
    } else {
      field += ch;
      i += 1;
    }
  }
  if (quoted) throw new Error("csv: unterminated quoted field");
  if (field !== "" || record.length > 0) endRecord();
  return records;
}

/**
 * Parses CSV text with a header row into objects keyed by trimmed header.
 * @param {string} text
 * @returns {Record<string, string>[]}
 */
export function parseCsvRecords(text) {
  const [header, ...body] = parseCsv(text);
  if (!header) return [];
  const keys = header.map((h) => h.trim());
  return body.map((fields, index) => {
    if (fields.length !== keys.length) {
      throw new Error(
        `csv: record ${index + 2} has ${fields.length} fields, header has ${keys.length}`,
      );
    }
    /** @type {Record<string, string>} */
    const record = {};
    keys.forEach((key, k) => {
      record[key] = fields[k];
    });
    return record;
  });
}
