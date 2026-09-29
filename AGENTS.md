# AGENTS.md

Guidance for coding agents working in this repository.

## Workflow

- Make changes on `develop`. Do not commit, merge, tag, or push unless
  explicitly asked — leave changes uncommitted for review.
- When asked to commit: English Conventional Commits (`feat:`, `fix(build):`,
  `ci(release):`, `chore(release):`), with a body of `- ` bullets explaining
  why.
- Release flow (only on request): `develop` is merged into `master` with
  `--no-ff` as `merge develop: <summary>`; a `v<version>` tag on `master`
  triggers `.github/workflows/release.yml` (npm OIDC publish + GitHub
  release). The tag must equal the `package.json` version or publishing is
  skipped. Bump with `npm version <x.y.z> --no-git-tag-version` so
  `package-lock.json` stays in sync.

## Commands

- Development needs Node ≥ 23.6: tests and scripts run `.ts` files directly
  via native type stripping (no tsx/ts-node). The published runtime target
  stays Node ≥ 18.
- Before finishing, run what CI runs:
  `npm run format:check && npm run check && npm test && npm run build && node scripts/smoke-dist.mjs`.
  CI also runs that dist smoke test on Node 18/20/22, so `src/` must not use
  JS or Node APIs newer than Node 18. Nothing checks this statically:
  `tsconfig` pins `lib` to ES2022, which only rules out newer JS built-ins —
  Node APIs are still typed from `@types/node` 24 — and the smoke test only
  catches the code paths it exercises.
- Single test: `node --test --test-name-pattern="<test name>" tests/api.test.ts`.
- Formatting is Prettier with default options (no config file); `data/`,
  `sql/` and `dist/` are excluded.

## TypeScript

- `erasableSyntaxOnly` + `verbatimModuleSyntax` are on: import local files
  with the `.ts` extension, mark type-only imports with `type`, and don't use
  enums, namespaces or constructor parameter properties.
- `src/` is bundled to both ESM and CJS. The CJS build defines
  `import.meta.url` as `undefined`, so module-relative paths must go through
  `moduleDir()` in `src/index.ts`.
- Zero runtime dependencies — never add to `dependencies`.
- Code comments and JSDoc are written in Chinese; match that.

## API invariants

- Returned `Division` records (including `subtree()` nodes and their
  `children`) are frozen, and returned arrays are copies. New APIs must keep
  this so callers can't corrupt the module-level cache.
- Code lookup tries the exact code first, then only official suffix trims
  (`officialTrim` / `codeCandidates`). Invalid codes like `130299` or
  `110101999000` must return not-found, never collapse onto an ancestor.
  A 12-digit county aggregation code (`…000000`) resolves to the county, not
  to a level-3 record numbered `000` under it — a township
  (`150524000000` → `150524`) or a same-named mirror (`710101000000` →
  `710101`); only a level-2 placeholder (`419001000`) keeps the 9-digit hit.
- Same-named placeholder level-2 layers (东莞市 `4419` → 东莞市 `441900`) and
  consecutive same-named `ancestors()` entries are intentional, not data bugs.

## Data

- `data/divisions.jsonl` is the source of truth: one object per line, sorted
  by code.
- `sql/postgresql/divisions.sql` is generated — never edit it by hand. Run
  `npm run generate:sql` after any JSONL change; a test checks the
  JSONL ↔ SQL round trip.
- `tests/data.test.ts` pins the total and per-level row counts. A data change
  must also update `DATA_VERSION` in `src/types.ts`, the counts in
  `README.md` / `README_en.md` / `NOTICE.md` / `NOTICE_en.md`, and
  `CHANGELOG.md`.
- Import normalization (drop the `91` "国外" tree, fix `~n` pinyin prefixes on
  `71`/`81`/`82`) lives in `scripts/import-seed.ts` and is documented in
  `NOTICE.md` / `NOTICE_en.md`; keep them in sync.

## Docs

- `README.md` / `NOTICE.md` (Chinese, the default) and `README_en.md` /
  `NOTICE_en.md` (English) mirror each other — update both languages. The
  full "code and hierarchy conventions" live in the NOTICEs; the READMEs
  carry a short summary linking there, so keep the summary consistent.
- User-visible changes go in `CHANGELOG.md` (Keep a Changelog). Keep the
  heading format `## [x.y.z] — YYYY-MM-DD`: the release workflow extracts the
  release notes by matching `## [<version>]`.
