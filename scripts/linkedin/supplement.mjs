// @ts-check
// Hand-entered facts the LinkedIn export does not contain (S3).
//
// This is the ONLY place the importer adds anything beyond what the export
// says, and every item names its source. The normalizer stays mechanical;
// the owner reviews this file and the generated seed's REVIEW markers.
//
// A `ref` selects one export row by file plus the header fields that make
// it unique (see NATURAL_KEYS in normalize.mjs). Matching 0 or 2+ rows is
// an error, never a guess.

/** @typedef {{ file: string } & Record<string, string>} Ref */
/** @typedef {{ ref: Ref, facet: string, source: string }} FacetOverride */
/** @typedef {{ from: Ref, type: string, to: Ref, note: string }} RelationSpec */
/**
 * @typedef {object} Credential
 * @property {string} credential_id
 * @property {string} credential_url
 * @property {string} title
 * @property {string} issuer
 * @property {string} issued_on  ISO date, day precision
 * @property {Ref} certifies
 * @property {string} source
 */
/** @typedef {{ credentials: Credential[], facets: FacetOverride[], relations: RelationSpec[], suggested: RelationSpec[] }} Supplement */

const BTT = {
  file: "Positions.csv",
  "Company Name": "Break Through Tech",
  Title: "AI/ML Cornell Tech Fellow",
};

/** @type {Supplement} */
export const supplement = {
  credentials: [
    {
      // The export has no Certifications.csv. Title, issuer, and issue date
      // were read from the public page of the owner-supplied credential URL
      // (mycredentials.ecornell.cornell.edu, credential bgjKUexFfN).
      credential_id: "bgjKUexFfN",
      credential_url: "https://mycredentials.ecornell.cornell.edu/credential/bgjKUexFfN",
      title: "Machine Learning Foundations",
      issuer: "eCornell (Cornell University)",
      issued_on: "2026-08-05",
      certifies: BTT,
      source: "owner-supplied credential URL; fields read from its public page",
    },
  ],

  facets: [
    {
      // BUILD_BRIEF §4.1: the Break Through Tech AI record is an experience
      // with facet `research`. Every other facet is left null for the owner.
      ref: BTT,
      facet: "research",
      source: "BUILD_BRIEF §4.1",
    },
  ],

  // Live relations. Only the brief §4.1 worked example is asserted here;
  // "which projects attach where" for everything else is the owner's item
  // (BUILD_PLAN §8, Pair 3).
  relations: [
    {
      from: { file: "Projects.csv", Title: "Airbnb Superhost Classifier" },
      type: "part_of",
      to: BTT,
      note:
        "the only project dated inside the Break Through Tech fellowship (Jul 2026) and its content (scikit-learn classifier) matches the Machine Learning Foundations curriculum named in the position",
    },
  ],

  // Emitted commented out in the seed: uncomment to enable.
  suggested: [
    {
      from: { file: "Projects.csv", Title: "Urban Arthropod Abundance Modeling" },
      type: "part_of",
      to: {
        file: "Positions.csv",
        "Company Name": "Wildlife Conservation Society",
        Title: "Data Field Researcher",
      },
      note:
        "same dates (Jun–Aug 2025) and the position's poster at the American Museum of Natural History is the project's figure set",
    },
  ],
};
