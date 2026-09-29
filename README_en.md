# cn-divisions

[![npm](https://img.shields.io/npm/v/cn-divisions)](https://www.npmjs.com/package/cn-divisions)
[![node](https://img.shields.io/node/v/cn-divisions)](https://www.npmjs.com/package/cn-divisions)
[![dependencies](https://img.shields.io/badge/dependencies-0-brightgreen)](https://www.npmjs.com/package/cn-divisions?activeTab=dependencies)
[![module](https://img.shields.io/badge/module-ESM%20%7C%20CJS-blue)](https://www.npmjs.com/package/cn-divisions)
[![types](https://img.shields.io/npm/types/cn-divisions)](https://www.npmjs.com/package/cn-divisions)
[![license](https://img.shields.io/npm/l/cn-divisions)](LICENSE)

[中文](README.md) | **English**

China's administrative divisions: **43,114 entries** across four levels
(province, city, county, township), each with pinyin (full and initial) and
the full official name. Ships with a typed lookup API and ready-to-load
PostgreSQL seed SQL.

| Level | Type                                              | Entries | Code digits | Example                |
| ----- | ------------------------------------------------- | ------: | ----------: | ---------------------- |
| 0     | Province / municipality / autonomous region / SAR |      34 |           2 | `11` 北京市            |
| 1     | City                                              |     392 |           4 | `1101` 北京市          |
| 2     | County / district                                 |   3,210 |           6 | `110101` 东城区        |
| 3     | Township / street                                 |  39,478 |           9 | `110101001` 东华门街道 |

- Codes follow GB/T 2260 and include Taiwan `71`, Hong Kong `81` and Macau
  `82`. A few entries break the digit counts — see
  [Code and hierarchy conventions](#code-and-hierarchy-conventions).
- The snapshot is **no older than April 2023**; later changes are not
  included. See [NOTICE_en.md](NOTICE_en.md).
- Companion package: [`cn-patent-ipc`](https://www.npmjs.com/package/cn-patent-ipc),
  the Chinese-edition IPC patent classification with SEI industry mapping.

## Install

```bash
npm install cn-divisions
```

The data file is read with `fs` from the installed package at runtime, so:

- **Yarn PnP**: switch to `nodeLinker: node-modules` or unplug this package
  (PnP zip virtual paths are not readable).
- **Bundling server code** (webpack, Next.js, Vite SSR, esbuild, …): mark
  `cn-divisions` as external.

## Usage

| Function              | Description                                                          |
| --------------------- | -------------------------------------------------------------------- |
| `getDivision(code)`   | Look up one record by code; `undefined` if not found                 |
| `normalizeCode(code)` | Official code → package code                                         |
| `children(code)`      | Direct children; `"0"` returns all provinces                         |
| `ancestors(code)`     | Ancestor chain, from province down to parent                         |
| `subtree(code)`       | Nested tree rooted at the code                                       |
| `search(options)`     | Filter by `name`, `pinyin`, `pinyinPrefix`, `level` (all must match) |
| `allDivisions()`      | All records, sorted by code                                          |
| `countByLevel()`      | Entry count per level                                                |

Also exported: the constants `LEVEL_NAMES` and `DATA_VERSION`, and the types
`Division`, `DivisionNode`, `SearchOptions` and `DivisionLevel`.

```ts
import { getDivision, children, ancestors, search } from "cn-divisions";

getDivision("110101");
// { code: "110101", parentCode: "1101", level: 2, name: "东城",
//   pinyinPrefix: "d", pinyin: "dong cheng", fullName: "东城区" }
getDivision("110101001000")?.fullName; // "东华门街道" (official 12-digit code)

children("0"); // all 34 province-level entries
ancestors("110101").map((d) => d.fullName); // ["北京市", "北京市"] (same name)

search({ pinyin: "dongguan" }); // full-pinyin substring, ignores case and spaces
search({ pinyinPrefix: "b", level: 0 }); // [北京]
```

- Data loads on first call and stays cached in memory. Returned records
  (including `subtree()` nodes) are frozen and typed `readonly`, and returned
  arrays are copies, so callers cannot corrupt the cache.
- `search()` throws a `TypeError` on unknown option keys or mistyped values
  (e.g. `level: "0"`) instead of silently ignoring them.
- Pinyin is toneless, with syllables separated by spaces. `ü` is written `v`
  (吕梁 `lv liang`) and `üe` as `ue` (略阳 `lue yang`); search accepts both
  `ü` and `v`.

## Code and hierarchy conventions

- Lookups also accept official 6- and 12-digit codes, exact match first.
  Invalid codes such as `130299` return not-found instead of collapsing onto
  an ancestor.
- Some cities (东莞, 中山, 济源, 仙桃, …) have a same-named placeholder layer
  between city and township, e.g. 东莞市 `4419` → 东莞市 `441900`, so
  `ancestors()` may return consecutive same-named entries — dedupe them for
  display.
- Province-direct county-level cities and HK/MO break the digit counts, so a
  child code is not always prefixed by its parent's: follow `parentCode`
  instead of truncating codes.
- Taiwan has no real township data (level 3 mirrors each district), and HK/MO
  have their own layering; data for all three is older than the mainland
  snapshot — treat it as indicative.

Full rules: [NOTICE_en.md](NOTICE_en.md#code-and-hierarchy-conventions).

## Raw data and SQL

The raw files ship as subpath exports; get a local path with
`require.resolve()` (in ESM, create `require` with `createRequire` first):

- `cn-divisions/data/divisions.jsonl` — the canonical dataset, one JSON
  object per line, sorted by code.
- `cn-divisions/sql/postgresql/divisions.sql` — `CREATE TABLE IF NOT EXISTS`
  for a `divisions` table, a `parent_code` index and batched `INSERT`s; runs
  as-is against an empty database:

```bash
psql --single-transaction -f divisions.sql
```

Existing codes fail with a duplicate-key error rather than silently mixing
two releases; `TRUNCATE` the table before loading a newer release.

## License

MIT for both the code and this data compilation. Data provenance, snapshot
dating and normalization: [NOTICE_en.md](NOTICE_en.md). Changes:
[CHANGELOG.md](CHANGELOG.md).
