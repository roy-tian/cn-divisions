# Changelog

All notable changes to this project are documented in this file. The format
is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this
project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- `README.md` and `NOTICE.md` are now in Chinese; the English versions moved
  to `README_en.md` and `NOTICE_en.md` (`README_zh.md` is gone). All four
  were reorganized for readability; the READMEs now summarize the code and
  hierarchy conventions and link to NOTICE for the full rules.

## [0.1.3] — 2026-09-29

### Upgrade notes

Most callers need no changes; check these:

- **TypeScript: records are `readonly`.** Assigning to a field of a returned
  record (or of your own type that `extends Division`) no longer compiles —
  copy first with `{ ...d }`. Functions receiving `subtree()` children should
  take `readonly DivisionNode[]` (or pass `[...node.children]`).
  `LEVEL_NAMES` is frozen. Record writes already threw at runtime since
  0.1.2.
- **`search()` throws on mistyped values.** A `level` that isn't the number
  0–3 (e.g. `"0"` straight from a query string) or a non-string `name` /
  `pinyin` / `pinyinPrefix` now throws a `TypeError` instead of returning
  `[]`. Convert input first (`Number(level)`) or catch the error.
- **12-digit county aggregation codes resolve to the county.** 362 `…000000`
  inputs change from a 9-digit level-3 record to the 6-digit county: 库伦旗
  `150524000000`, 姑苏区 `320508000000`, 西沙区 `460301000000`, 南沙区
  `460302000000` and the 358 Taiwan districts (`71xxxx000000`). The old
  9-digit codes still resolve, so nothing errors, but re-normalize stored
  results of `normalizeCode()` / `getDivision()` if you join or dedupe on
  them.
- **`children("0")` returns the 34 province-level entries** instead of `[]`;
  if you used `"0"` as a "nothing selected" sentinel, handle it before
  calling.

Code that only reads `data/divisions.jsonl` or the SQL seed is unaffected.

### Added

- `children("0")` returns all 34 province-level entries (`"0"` is their
  `parentCode`).
- `search({ pinyin })` accepts `ü` and maps it to the data's spellings:
  `v` for ü (`"lüliang"` finds 吕梁市 like `"lvliang"`) and `ue` for üe
  (`"lüeyang"` finds 略阳县). Decomposed input (`u` + U+0308) is normalized.

### Changed

- `Division` fields and `DivisionNode.children` are typed `readonly`,
  matching the frozen runtime objects, so accidental writes fail at compile
  time. `allDivisions()` now returns `Division[]` like the other list APIs
  (it was already a fresh copy). `LEVEL_NAMES` is frozen.
- `search()` validates values as well as keys: a non-object argument, a
  non-string `name` / `pinyin` / `pinyinPrefix`, or a `level` outside 0–3
  throws a `TypeError` (previously `level: "0"` silently matched nothing).
  `search()` with no argument returns the full table, and `undefined` / `null`
  option values count as unset (`SearchOptions` fields now accept `null`).
  Options are read once and validated as read, so inherited properties and
  getters are checked too.
- `search()` is faster: a `level` condition scans only that level (e.g.
  `{ pinyinPrefix: "b", level: 0 }` drops from ~0.7 ms to ~3 µs), and name
  matching checks only `fullName`, which always contains the short name
  (about 30% faster).

### Fixed

- 12-digit NBS county aggregation codes now always resolve to the county
  rather than a level-3 record numbered `000` under it: a non-standard
  township (`150524000000` → 库伦旗 `150524`, was 库伦街道 `150524000`;
  likewise 姑苏区 `320508`) or a childless same-named mirror (the 358 Taiwan
  districts and 三沙 西沙区 / 南沙区, e.g. `710101000000` → 中正区 `710101`,
  was the level-3 copy `710101000`). Level-2 placeholders of county-level
  cities still take the 9-digit hit (`419001000000` → `419001000`).
- CommonJS type resolution: the package now ships `index.d.cts` and
  per-condition `types`, so `require`-style imports type-check under
  `module: node16` (previously error TS1479).
- Docs: the NOTICE province breakdown (the 23 省 already include 台湾省),
  code-length exceptions and `parentCode` traversal, the actual TW/HK/MO
  hierarchy (including `810000` / `820000` resolving to the level-2 layer),
  the NBS township trim, and a bundler caveat.

## [0.1.2] — 2026-09-28

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
