# Changelog

All notable changes to this project are documented in this file. The format
is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this
project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.2] — unreleased

### Added

- Official-code lookup: `getDivision` / `children` / `ancestors` / `subtree`
  now also accept standard 6-digit GB/T 2260 codes (`110000`, `131000`) and
  12-digit NBS township codes (`110101001000`), resolved exact/longest first —
  exact package codes are always preferred (e.g. 东莞 `441900` stays
  county-level). Trims follow official suffix shapes only (province `…0000`,
  city `…00`, NBS county aggregation `…000000`); invalid codes such as
  `130299` or `110101999000` return not-found instead of collapsing onto an
  ancestor, and official 12-digit codes of placeholder-layer cities resolve
  to the placeholder record (`441900000000` → `441900`). New `normalizeCode()`
  helper maps official codes to package codes.
- `search({ pinyin })` — full-pinyin substring matching, case- and
  space-insensitive (`"dongguan"` and `"dong guan"` both match 东莞).
- The PostgreSQL seed now opens with `CREATE TABLE IF NOT EXISTS` plus a
  `parent_code` index, so `sql/postgresql/divisions.sql` runs as-is against
  an empty database.
- This `CHANGELOG.md`; README/NOTICE now document the trimmed-code
  convention, placeholder level-2 layers under district-less prefecture
  cities and province-direct county-level cities, TW/HK/MO depth and data
  vintage, the Node ≥ 23.6 dev requirement, and the Yarn PnP caveat.

### Changed

- Returned `Division` records are frozen — including `subtree()` nodes and
  their `children` arrays — and `children()` / `allDivisions()` return fresh
  arrays; callers can no longer corrupt the module-level cache by mutating
  results.
- `search()` throws a `TypeError` on unrecognized option keys instead of
  silently ignoring them and returning the full table.

## [0.1.1] — 2026-09-11

### Fixed

- Release workflow: skip publishing when the pushed tag does not match the
  `package.json` version or when that version is already on npm (recovery
  from the failed 0.1.0 publish).
- Build: silence the esbuild empty-import-meta warning in the CJS output.

## [0.1.0] — 2026-09-11

### Added

- Initial release: 43,114 divisions across four levels (34 / 392 / 3,210 /
  39,478) with pinyin (spaced syllables + initial letter), a typed lookup
  API (`getDivision`, `children`, `ancestors`, `subtree`, `search`,
  `allDivisions`, `countByLevel`), the canonical `divisions.jsonl` dataset
  and PostgreSQL seed SQL.
