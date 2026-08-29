-- supabase/seed.content.sql — REAL CONTENT, owner-editable.
--
-- Generated once by `npm run linkedin:import` (S3, scripts/linkedin/) from the
-- owner's LinkedIn data export, then edited by hand. The export itself is
-- never committed. Re-running the importer OVERWRITES this file and every
-- edit made since (it refuses unless --force), so edit here, not upstream.
--
-- Loads after supabase/seed.sql (fixture data) through `npm run db:apply`
-- locally and in CI; never runs on the hosted project.
--
-- Idempotent: every row upserts on a fixed id. Ids are stable handles —
-- change anything else, never an id. Relations are written by slug, so a
-- renamed slug must be renamed here too; a relation naming a slug that does
-- not exist fails the seed loudly (null id → not-null violation). After
-- removing or moving a row or relation, `npm run db:reset`.
--
-- REVIEW marks a field the export could not supply or a judgment to confirm
-- (BUILD_PLAN §8: "edit the normalized BTT record for accuracy" before S6).
-- Dates carry metadata.date_precision (month = day is a placeholder 01).

-- entries ------------------------------------------------------------------

insert into public.entries as e
  (id, kind, facet, slug, title, subtitle, summary, body, start_date, end_date, is_current, status, icon_asset, accent_color, featured, sort_weight, metadata)
values
  -- Positions.csv: Break Through Tech · AI/ML Cornell Tech Fellow · May 2026
  ('0e02f978-92d2-5be6-a19a-b0addaa5bc2c',
   'experience',
   'research',
   'break-through-tech',
   'AI/ML Cornell Tech Fellow',
   'Break Through Tech',
   'Cornell Tech ML curriculum plus LLM application work in Python, continuing into a sponsored AI Studio project.',
   $md$- Completing the Machine Learning Foundations curriculum at Cornell Tech, covering supervised learning, model evaluation, and a neural network capstone.
- Building LLM applications in Python, including a LangChain RAG pipeline with Chroma, OpenAI embeddings, and query rewriting, and an agentic workflow with request routing, an evaluator-optimizer loop, and a FastMCP tool server.
- Continuing into the AI Studio project in fall 2026, an industry-sponsored machine learning project delivered with a student team. Sponsor to be announced.$md$,
   '2026-05-01',
   null,
   true,
   'in_progress',
   null,
   null,
   true,
   90,
   '{"source":{"export":"linkedin","file":"Positions.csv"},"date_precision":"month","location":"New York, NY"}'::jsonb),

  -- Positions.csv: Guardian Life · Data Engineering Intern · May 2026
  ('4c6c1c7b-06c4-547d-8cea-bdc33b7c135b',
   'experience',
   'corporate',
   'guardian',
   'Data Engineering Intern',
   'Guardian Life',
   'Shipped a PySpark CDC utility and a row-level quarantine framework to production, and built the backend for an LLM reporting service that generated executive decks.',
   $md$- Built a CDC utility that can be applied in ELT pipelines across staging tables in Databricks on Azure using PySpark and SQL, processing hundreds of thousands of policy records for the FPRS and CSWM data team.
- Built a quarantine framework utility for row-level failures that can automate hundreds of thousands of data quality validations; passed UAT, and deployed to production.
- Scheduled pipeline runs with Control-M and deployed through Jenkins.
- Assisted in building the backend for a five-person intern capstone, an LLM-powered reporting service that ingested data in row batches through REST APIs and returned executive summary insights, then auto-generated stakeholder PowerPoint decks.
- Developed product-specific prompt endpoints, delivering the dental line first with the service designed to extend to additional coverage lines, and built polling APIs to track long-running generation jobs.$md$,
   '2026-05-01',
   '2026-08-01',
   false,
   'unlocked',
   null,
   null,
   true,
   100,
   '{"source":{"export":"linkedin","file":"Positions.csv"},"date_precision":"month","location":"New York, NY"}'::jsonb),

  -- Positions.csv: Fordham University · Undergraduate Research Assistant · Jan 2026
  ('4d136059-c59e-56b0-ba89-1c87c81c8e61',
   'experience',
   'research',
   'fordham-research-assistant',
   'Undergraduate Research Assistant',
   'Fordham University',
   'Designed a Neo4j graph schema with Columbia''s BioNet Group and exposed it through a FastAPI GraphQL service.',
   $md$- Collaborated with the BioNet Group at Columbia University to design a unified Neo4j graph schema for FlyBrainLab integration.
- Extended the graph with authentication and session nodes and exposed it through a FastAPI service with a read-only GraphQL layer, splitting relational auth data in MySQL from graph data in Neo4j.$md$,
   '2026-01-01',
   '2026-05-01',
   false,
   'unlocked',
   null,
   null,
   false,
   80,
   '{"source":{"export":"linkedin","file":"Positions.csv"},"date_precision":"month","location":"New York, United States"}'::jsonb),

  -- Positions.csv: Fordham University · Teaching Assistant for Information & Data Management (CISC 2500) · Jan 2026
  ('a0b8399f-2df4-5fde-a700-07bfd5eeee81',
   'experience',
   'classroom',
   'fordham-ta-cisc-2500',
   'Teaching Assistant for Information & Data Management (CISC 2500)',
   'Fordham University',
   'Ran office hours and graded Python, pandas, and NumPy work for an undergraduate data management course.',
   $md$- Led weekly office hours for undergraduates on Jupyter, Python, and object-oriented programming.
- Graded assignments and quizzes with written feedback on NumPy, pandas, and Matplotlib work.
- Supported course operations and technical communication.$md$,
   '2026-01-01',
   '2026-05-01',
   false,
   'unlocked',
   null,
   null,
   false,
   0,
   '{"source":{"export":"linkedin","file":"Positions.csv"},"date_precision":"month","location":"New York, United States"}'::jsonb),

  -- Positions.csv: Wildlife Conservation Society · Data Analyst Researcher · Sep 2025
  ('c209e95a-a6bb-5aef-b139-63525cec4be6',
   'experience',
   'research',
   'wcs-data-analyst',
   'Data Analyst Researcher',
   'Wildlife Conservation Society',
   'Built Python ETL pipelines over 300k+ ecological records and presented at the Bronx Science Consortium Poster Symposium.',
   $md$- Developed Python ETL pipelines to efficiently ingest and validate over 300k records from various ecological datasets.
- Designed indexed analytical tables, significantly reducing query latency for downstream analysis and dashboards.
- Transformed and standardized CSV data using Python libraries, enhancing the quality of visual analytics outputs for research interns.
- Presented research findings at the Bronx Science Consortium (BSC) Poster Symposium, held internally at the Bronx Zoo.$md$,
   '2025-09-01',
   '2026-01-01',
   false,
   'unlocked',
   null,
   null,
   false,
   70,
   '{"source":{"export":"linkedin","file":"Positions.csv"},"date_precision":"month","location":"New York, NY"}'::jsonb),

  -- Positions.csv: Wildlife Conservation Society · Data Field Researcher · Jun 2025
  ('da225b84-fe5a-51cc-86e3-940662726a09',
   'experience',
   'research',
   'wcs-field-researcher',
   'Data Field Researcher',
   'Wildlife Conservation Society',
   'Mentored four high school researchers in urban ecology and presented our poster at the NYCSRM Symposium at AMNH.',
   $md$- Mentored 4 high school research assistants in urban ecology research focusing on trees, arthropods, and soil quality.
- Employed quantitative and qualitative methods for data collection and analysis using Google Sheets/Excel.
- Collaborated with the Nature Conservancy to assess tree health and diversity in urban parks.
- Authored a scientific poster presented at the NYCSRM Consortium Student Research Symposium, held at the American Museum of Natural History.$md$,
   '2025-06-01',
   '2025-08-01',
   false,
   'unlocked',
   null,
   null,
   false,
   0,
   '{"source":{"export":"linkedin","file":"Positions.csv"},"date_precision":"month","location":"Bronx, New York, United States"}'::jsonb),

  -- Positions.csv: Fordham University · INSTEP Program Mentor · Jan 2025
  ('3d7d6c07-6ba6-59da-ac8e-bf840933c78d',
   'experience',
   'classroom',
   'fordham-instep',
   'INSTEP Program Mentor',
   'Fordham University',
   'Mentored over 20 high school students through one-on-one advising and enrichment sessions on the transition to college.',
   $md$- Mentored over 20 high school students in academic readiness and career planning.
- Facilitated one-on-one advising and small-group sessions to ease the transition to college.
- Organized enrichment activities to develop leadership, resilience, and problem-solving skills.$md$,
   '2025-01-01',
   '2025-05-01',
   false,
   'unlocked',
   null,
   null,
   false,
   0,
   '{"source":{"export":"linkedin","file":"Positions.csv"},"date_precision":"month","location":"New York, United States"}'::jsonb),

  -- Positions.csv: Fordham University · STEP Tutor Counselor · May 2024
  ('82015acc-a08b-5e82-849a-ea2b00c9256d',
   'experience',
   'classroom',
   'fordham-step-tutor',
   'STEP Tutor Counselor',
   'Fordham University',
   'Taught math, computer science, and financial literacy to 100+ students, with workshops on study strategies and time management.',
   $md$- Delivered instruction in math, computer science, and financial literacy to over 100 students, enhancing comprehension and test scores by approximately 15%.
- Facilitated more than four workshops focused on time management, study strategies, and problem-solving to prepare students for higher education.
- Provided individualized tutoring and academic support, significantly improving student performance in core STEM subjects.$md$,
   '2024-05-01',
   '2025-05-01',
   false,
   'unlocked',
   null,
   null,
   false,
   0,
   '{"source":{"export":"linkedin","file":"Positions.csv"},"date_precision":"month","location":"New York, New York, United States"}'::jsonb),

  -- Positions.csv: Fordham University · CSTEP Summer Scholar · Jul 2023
  ('38d15ee0-5eee-55ef-91a6-57e6cac1175e',
   'experience',
   'coursework',
   'fordham-cstep-scholar',
   'CSTEP Summer Scholar',
   'Fordham University',
   'Four-week residential cohort of 24 students condensing Fordham''s Faith and Critical Reasoning core course.',
   $md$Completed an accelerated four-week cohort condensing Fordham's Faith and Critical Reasoning core course. One of 24 students selected; lived on campus at Rose Hill for the duration of the program.$md$,
   '2023-07-01',
   '2023-07-01',
   false,
   'unlocked',
   null,
   null,
   false,
   0,
   '{"source":{"export":"linkedin","file":"Positions.csv"},"date_precision":"month","location":"New York, United States"}'::jsonb),

  -- Projects.csv: Urban Arthropod Abundance Modeling · Jun 2025
  ('d7c5b422-bba3-5942-9347-2e1689dfa819',
   'project',
   'research',
   'urban-arthropod-abundance-modeling',
   'Urban Arthropod Abundance Modeling',
   'Wildlife Conservation Society',
   'Modeled fly and spider abundance against temperature, air quality, and season in Bronx field data using scikit-learn.',
   $md$Built linear regression models in Python and scikit-learn to test how temperature, air quality, season, and year relate to fly and spider abundance in field data collected around Pelham Parkway in the Bronx. Standardized continuous predictors and one-hot encoded seasonal categories, then exported per-taxon coefficients and predictions to CSV so results stayed reproducible. Wrote the visualization layer in Matplotlib and pandas to produce the figures I presented in a scientific poster at the NYCSRM Consortium Student Research Symposium, held at the American Museum of Natural History. Reported adjusted R-squared alongside R-squared, which showed the models explained little variance at this sample size and that the coefficients were not reliable enough to draw conclusions from.$md$,
   '2025-06-01',
   '2025-08-01',
   false,
   'unlocked',
   null,
   null,
   false,
   90,
   '{"source":{"export":"linkedin","file":"Projects.csv"},"date_precision":"month"}'::jsonb),

  -- Projects.csv: Airbnb Superhost Classifier · Jul 2026
  ('64517535-a8d4-5176-bd87-4617453a9a5b',
   'project',
   'coursework',
   'airbnb-superhost-classifier',
   'Airbnb Superhost Classifier',
   'Break Through Tech',
   'Logistic regression predicting superhost status, tuned with GridSearchCV to 0.82 ROC AUC on held-out data.',
   $md$Trained a logistic regression model in scikit-learn to predict whether an Airbnb host holds superhost status from listing and review features. Ran GridSearchCV with 5-fold cross validation across 10 regularization values to select the hyperparameter, then compared the tuned model against the default using confusion matrices, precision-recall curves, and ROC curves. Reached an ROC AUC of 0.82 on the held-out test set, with tuning producing almost no gain over the default, and used SelectKBest to confirm review volume and host response rate carried most of the signal. Serialized the final model with pickle and reloaded it to verify it predicted correctly after deserialization.$md$,
   '2026-07-01',
   '2026-07-01',
   false,
   'unlocked',
   null,
   null,
   true,
   100,
   '{"source":{"export":"linkedin","file":"Projects.csv"},"date_precision":"month"}'::jsonb),

  -- Education.csv: Fordham University Graduate School of Arts and Sciences · Master of Science - MS · Aug 2026
  -- REVIEW: facet stays null for now — whether education earns a sixth facet value is an open owner note (affects BUILD_BRIEF §4 and FACETS in lib/content/schema.ts)
  ('4da2b4fd-332a-5942-98bc-d7c1eea144ac',
   'education',
   null,
   'fordham-ms-data-science',
   'Master of Science - MS',
   'Fordham University Graduate School of Arts and Sciences',
   'Fordham''s 4+1 accelerated program, completing the MS in Data Science alongside the BS in Computer Science.',
   $md$Admitted through Fordham's 4+1 accelerated program, completing the MS in Data Science alongside my BS in Computer Science.$md$,
   '2026-08-01',
   '2028-05-01',
   false,
   'in_progress',
   null,
   null,
   false,
   100,
   '{"source":{"export":"linkedin","file":"Education.csv"},"date_precision":"month"}'::jsonb),

  -- Education.csv: Fordham University · Bachelor of Science - BS · Jul 2023
  -- REVIEW: facet stays null for now — whether education earns a sixth facet value is an open owner note (affects BUILD_BRIEF §4 and FACETS in lib/content/schema.ts)
  ('76cfe335-a6c2-5acc-95f0-7ae80b3dbf49',
   'education',
   null,
   'fordham-bs-computer-science',
   'Bachelor of Science - BS',
   'Fordham University',
   'Dean''s List, with coursework across data mining, machine learning, databases, and operating systems.',
   $md$Dean's List. Relevant coursework: Data Mining, Machine Learning Foundations, Information and Data Management, Operating Systems, Mathematics for Data Science, Linear Algebra and Programming for Math and Science, Data Communications and Networks.

Activities: Undergraduate Research Assistant (Database) Teacher's Assistant (CISC 2500) Black Student Alliance Computer Science Club CSTEP (Collegiate Science and Technology Entry Program) CSTEP Summer Scholar (Summer 2023)$md$,
   '2023-07-01',
   '2027-05-01',
   false,
   'in_progress',
   null,
   null,
   false,
   90,
   '{"source":{"export":"linkedin","file":"Education.csv"},"date_precision":"month","activities":"Undergraduate Research Assistant (Database) Teacher''s Assistant (CISC 2500) Black Student Alliance Computer Science Club CSTEP (Collegiate Science and Technology Entry Program) CSTEP Summer Scholar (Summer 2023)"}'::jsonb),

  -- Honors.csv: CSTEP Scholarship
  ('ac0c7640-e829-5908-859f-257fa9541bdd',
   'certification',
   null,
   'cstep-scholarship',
   'CSTEP Scholarship',
   'Fordham University',
   'Academic scholarship endowed by a Fordham alumna and her husband, awarded through CSTEP.',
   $md$CSTEP awarded/supporting students like myself an academic scholarship endowed by a Fordham alumna and her husband. Applied to Spring 2024.$md$,
   '2023-11-01',
   null,
   false,
   'unlocked',
   null,
   null,
   false,
   0,
   '{"source":{"export":"linkedin","file":"Honors.csv"},"date_precision":"month","category":"award","program":"CSTEP"}'::jsonb),

  -- Honors.csv: Fordham Jogues Scholarship
  ('478a60ea-8507-55a7-bfcd-cb2d80c060f9',
   'certification',
   null,
   'fordham-jogues-scholarship',
   'Fordham Jogues Scholarship',
   'Fordham University',
   'Merit scholarship awarded on entry for academic performance and leadership.',
   $md$Annual merit scholarship awarded to incoming first-year students for academic performance and leadership potential.$md$,
   '2023-07-01',
   null,
   false,
   'unlocked',
   null,
   null,
   false,
   0,
   '{"source":{"export":"linkedin","file":"Honors.csv"},"date_precision":"month","category":"award"}'::jsonb),

  -- Honors.csv: Dean's List
  ('f7f7efa6-eb00-50a8-9662-1e6e8bc92113',
   'certification',
   null,
   'deans-list',
   'Dean''s List',
   'Fordham University',
   'Awarded Spring 2024, Spring 2025, and Fall 2025.',
   $md$Spring 2024, Spring 2025, Fall 2025$md$,
   '2026-01-01',
   null,
   false,
   'unlocked',
   null,
   null,
   false,
   0,
   '{"source":{"export":"linkedin","file":"Honors.csv"},"date_precision":"month","category":"award"}'::jsonb),

  -- Honors.csv: Riversville Foundation Scholarship
  ('6c3b9240-61c9-5359-90a1-dfef3d9467b7',
   'certification',
   null,
   'riversville-foundation-scholarship',
   'Riversville Foundation Scholarship',
   'Fordham University',
   'Renewable scholarship supporting the BS in Computer Science and continuing through the MS in Data Science.',
   $md$Renewable scholarship supporting my BS in Computer Science at Fordham, continuing through my MS in Data Science.$md$,
   '2024-08-01',
   null,
   false,
   'unlocked',
   null,
   null,
   false,
   0,
   '{"source":{"export":"linkedin","file":"Honors.csv"},"date_precision":"month","category":"award","program":"CSTEP"}'::jsonb),

  -- Volunteering.csv: Brooklyn Public Library · Stocker · Jun 2019
  ('27922083-51e7-514b-884b-4852c82b8383',
   'experience',
   'volunteer',
   'bpl-stocker',
   'Stocker',
   'Brooklyn Public Library',
   'Shelved books and restocked supplies at a Brooklyn Public Library branch through freshman year of high school.',
   $md$- Shelved books and restocked supplies through my freshman year of high school, until the COVID-19 pandemic closed the branch.$md$,
   '2019-06-01',
   '2020-06-01',
   false,
   'unlocked',
   null,
   null,
   false,
   0,
   '{"source":{"export":"linkedin","file":"Volunteering.csv"},"date_precision":"month"}'::jsonb),

  -- credential: bgjKUexFfN
  ('d9a232aa-96f4-5577-817c-8ca40dbd8b18',
   'certification',
   null,
   'machine-learning-foundations',
   'Machine Learning Foundations',
   'eCornell (Cornell University)',
   'Cornell Tech certificate covering supervised learning, model evaluation, and a neural network capstone.',
   null,
   '2026-08-05',
   null,
   false,
   'unlocked',
   null,
   null,
   true,
   0,
   '{"source":{"export":"credential-page","url":"https://mycredentials.ecornell.cornell.edu/credential/bgjKUexFfN"},"date_precision":"day","category":"certification","credential_id":"bgjKUexFfN","credential_url":"https://mycredentials.ecornell.cornell.edu/credential/bgjKUexFfN"}'::jsonb)
on conflict (id) do update set
  kind = excluded.kind,
  facet = excluded.facet,
  slug = excluded.slug,
  title = excluded.title,
  subtitle = excluded.subtitle,
  summary = excluded.summary,
  body = excluded.body,
  start_date = excluded.start_date,
  end_date = excluded.end_date,
  is_current = excluded.is_current,
  status = excluded.status,
  icon_asset = excluded.icon_asset,
  accent_color = excluded.accent_color,
  featured = excluded.featured,
  sort_weight = excluded.sort_weight,
  metadata = excluded.metadata
where (e.kind, e.facet, e.slug, e.title, e.subtitle, e.summary, e.body, e.start_date, e.end_date, e.is_current, e.status, e.icon_asset, e.accent_color, e.featured, e.sort_weight, e.metadata)
   is distinct from
      (excluded.kind, excluded.facet, excluded.slug, excluded.title, excluded.subtitle, excluded.summary, excluded.body, excluded.start_date, excluded.end_date, excluded.is_current, excluded.status, excluded.icon_asset, excluded.accent_color, excluded.featured, excluded.sort_weight, excluded.metadata);

-- relations: "<from> <relation_type> <to>" ---------------------------------

insert into public.entry_relations (from_entry_id, to_entry_id, relation_type) values
  -- confirmed (owner): airbnb-superhost-classifier part_of break-through-tech — the only project dated inside the Break Through Tech fellowship (Jul 2026) and its content (scikit-learn classifier) matches the Machine Learning Foundations curriculum named in the position
  ((select id from public.entries where slug = 'airbnb-superhost-classifier'),
   (select id from public.entries where slug = 'break-through-tech'),
   'part_of'),
  -- confirmed (owner): machine-learning-foundations certifies break-through-tech — owner-supplied credential URL; fields read from its public page
  ((select id from public.entries where slug = 'machine-learning-foundations'),
   (select id from public.entries where slug = 'break-through-tech'),
   'certifies'),
  -- confirmed (owner): urban-arthropod-abundance-modeling part_of wcs-field-researcher — same dates (Jun–Aug 2025) and the position's poster at the American Museum of Natural History is the project's figure set
  ((select id from public.entries where slug = 'urban-arthropod-abundance-modeling'),
   (select id from public.entries where slug = 'wcs-field-researcher'),
   'part_of')
on conflict do nothing;

-- links ---------------------------------------------------------------------

insert into public.links as l (id, entry_id, label, url, kind) values
  ('c3ffabf9-ae1c-5012-9658-1f2c11aa808f', 'd9a232aa-96f4-5577-817c-8ca40dbd8b18', 'View credential', 'https://mycredentials.ecornell.cornell.edu/credential/bgjKUexFfN', 'profile')
on conflict (id) do update set
  entry_id = excluded.entry_id, label = excluded.label, url = excluded.url, kind = excluded.kind
where (l.entry_id, l.label, l.url, l.kind) is distinct from (excluded.entry_id, excluded.label, excluded.url, excluded.kind);
