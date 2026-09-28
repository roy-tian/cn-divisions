# cn-divisions

China administrative divisions as a zero-dependency dataset — **43,114 entries**
across four levels (province / city / county / township), each with pinyin and
the full official name, plus a typed lookup API and ready-to-run PostgreSQL
seeds.

中国行政区划数据包:省、市、区县、乡镇/街道四级共 43,114 条,含拼音与全称,
零运行时依赖,附带 TypeScript 查询 API 和可直接执行的 PostgreSQL 种子 SQL。
[中文说明](README_zh.md)

- Levels: 34 省/直辖市/自治区/特别行政区 · 392 市 · 3,210 区/县 · 39,478 乡镇/街道
- Codes follow the GB/T 2260 system; 台湾 `71`, 香港 `81`, 澳门 `82` included
- Snapshot dated by change markers to **April 2023 or newer** — changes after
  that lower bound are **not** included; see [NOTICE.md](NOTICE.md)
- Companion package: [`cn-patent-ipc`](https://www.npmjs.com/package/cn-patent-ipc)
  — Chinese-edition IPC patent classification with SEI industry mapping

## Install

```bash
npm install cn-divisions
```

Node.js ≥ 18. ESM and CJS are both supported.

## API

```ts
import {
  getDivision,
  children,
  ancestors,
  subtree,
  search,
  allDivisions,
  countByLevel,
  normalizeCode,
} from "cn-divisions";

getDivision("110101");
// { code: "110101", parentCode: "1101", level: 2, name: "东城",
//   pinyinPrefix: "d", pinyin: "dong cheng", fullName: "东城区" }

// Lookups also accept official full codes — 6-digit GB/T 2260 and
// 12-digit NBS — with exact/longer matches taking priority
getDivision("110000")?.fullName; // "北京市" (→ package code "11")
getDivision("110101001000")?.fullName; // "东华门街道" (→ "110101001")
normalizeCode("131000"); // "1310" (official code → package code)

children("1310").map((d) => d.fullName); // under 廊坊市: 三河市、香河县, …
ancestors("110101").map((d) => d.fullName); // [ "北京市", "北京市" ]
subtree("11"); // nested tree under 北京
search({ name: "三河" }); // substring over name/fullName
search({ pinyin: "dong guan" }); // full-pinyin substring, case/space-insensitive
search({ pinyinPrefix: "b", level: 0 }); // [ 北京 ]
countByLevel(); // { 0: 34, 1: 392, 2: 3210, 3: 39478 }
```

All data loads lazily on first call and is cached in memory (~43k rows,
one-time parse). Returned records are frozen (including `subtree()` nodes)
and arrays are copies — callers cannot corrupt the cache.

## Code and hierarchy conventions

- **Package code lengths**: province 2 digits (`11`), city 4 (`1101`), county
  6 (`110101`), township 9 (`110101001`). Every lookup additionally accepts
  official 6/12-digit codes (exact match preferred). Trims follow official
  suffix shapes only — province `…0000`, city `…00`, NBS county aggregation
  (`…000000`); invalid codes such as `130299` or `110101999000` return
  not-found instead of collapsing onto an ancestor.
- **District-less prefecture cities and province-direct county-level cities**
  (东莞, 中山, 儋州; 济源, 仙桃, 潜江, 天门, XPCC cities, Hainan directs)
  keep a same-named placeholder level-2 layer between city and township, e.g.
  东莞市 `4419` → 东莞市 `441900` → streets. `ancestors()` may therefore
  return consecutive same-named entries — dedupe for display. These
  county-level cities are typed as level 1; their official 12-digit codes
  resolve to the placeholder record (`441900000000` → `441900`, level 2).
- **Taiwan / Hong Kong / Macau**: Taiwan goes down to cities/counties and a
  few districts only; HK/MO are chains of 特别行政区 → placeholder layer →
  districts. Data under `71`/`81`/`82` is older than the mainland snapshot —
  treat it as indicative.
- **Data vintage**: the snapshot only has a lower bound (≥ 2023-04, see
  [NOTICE.md](NOTICE.md)); later reorganizations (撤县设区, township mergers,
  …) are not included.

## Raw data and SQL seeds

The package also ships the raw files, exposed as subpath imports:

- `cn-divisions/data/divisions.jsonl` — canonical dataset, one JSON object per
  line, sorted by code
- `cn-divisions/sql/postgresql/divisions.sql` — batched `INSERT`s for a
  `divisions` table, prefixed with `CREATE TABLE IF NOT EXISTS` and a
  `parent_code` index, so it runs as-is against an empty database
  (regenerate with `npm run generate:sql`)

```ts
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const sqlPath = require.resolve("cn-divisions/sql/postgresql/divisions.sql");
```

## Updating the data

Edit `data/divisions.jsonl`, regenerate the SQL, bump the version, and update
`DATA_VERSION` in `src/types.ts` plus [CHANGELOG.md](CHANGELOG.md). The test
suite pins row counts and verifies the JSONL ↔ SQL round trip, so an
inconsistent update fails CI.

## Developing

Runtime supports Node ≥ 18, but developing and testing require **Node ≥ 23.6**
— tests run `.ts` files directly via native type stripping. Yarn PnP users
must switch to `nodeLinker: node-modules` (or unplug this package): the data
file is read via `fs`, and PnP zip virtual paths are not readable.

## License

MIT for code and this compilation. Data provenance, snapshot dating and
normalization notes: [NOTICE.md](NOTICE.md). Changelog:
[CHANGELOG.md](CHANGELOG.md).
