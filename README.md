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
- Snapshot dated by change markers to **April 2023 or newer** — see
  [NOTICE.md](NOTICE.md)
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
} from "cn-divisions";

getDivision("110101");
// { code: "110101", parentCode: "1101", level: 2, name: "东城",
//   pinyinPrefix: "d", pinyin: "dong cheng", fullName: "东城区" }

children("1310").map((d) => d.fullName); // 廊坊市下辖: 三河市、香河县, …
ancestors("110101").map((d) => d.fullName); // [ "北京市", "北京市" ]
subtree("11"); // nested tree under 北京
search({ name: "三河" }); // substring over name/fullName
search({ pinyinPrefix: "b", level: 0 }); // [ 北京 ]
countByLevel(); // { 0: 34, 1: 392, 2: 3210, 3: 39478 }
```

All data loads lazily on first call and is cached in memory (~43k rows,
one-time parse).

## Raw data and SQL seeds

The package also ships the raw files, exposed as subpath imports:

- `cn-divisions/data/divisions.jsonl` — canonical dataset, one JSON object per
  line, sorted by code
- `cn-divisions/sql/postgresql/divisions.sql` — batched `INSERT`s for a
  `divisions` table (regenerate with `npm run generate:sql`)

```ts
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const sqlPath = require.resolve("cn-divisions/sql/postgresql/divisions.sql");
```

## Updating the data

Edit `data/divisions.jsonl`, regenerate the SQL, bump the version, and update
`DATA_VERSION` in `src/types.ts`. The test suite pins row counts and verifies
the JSONL ↔ SQL round trip, so an inconsistent update fails CI.

## License

MIT for code and this compilation. Data provenance, snapshot dating and
normalization notes: [NOTICE.md](NOTICE.md).
