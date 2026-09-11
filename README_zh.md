# cn-divisions

中国行政区划数据包:省、市、区县、乡镇/街道四级共 **43,114 条**,每条含拼音
(全拼 + 首字母)与全称,零运行时依赖,附带 TypeScript 查询 API 与可直接执行的
PostgreSQL 种子 SQL。[English](README.md)

- 各级条目:34 省/直辖市/自治区/特别行政区 · 392 市 · 3,210 区/县 · 39,478 乡镇/街道
- 代码遵循 GB/T 2260 体系,含台湾 `71`、香港 `81`、澳门 `82`
- 快照按行政区划变更标志物断代为 **2023 年 4 月及之后** — 详见
  [NOTICE.md](NOTICE.md)
- 姊妹包:[`cn-patent-ipc`](https://www.npmjs.com/package/cn-patent-ipc)
  — 中文版专利 IPC 分类号数据,附战略性新兴产业(SEI)映射

## 安装

```bash
npm install cn-divisions
```

要求 Node.js ≥ 18,同时支持 ESM 与 CJS。

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
subtree("11"); // 北京下的嵌套树
search({ name: "三河" }); // 简称/全称子串匹配
search({ pinyinPrefix: "b", level: 0 }); // [ 北京 ]
countByLevel(); // { 0: 34, 1: 392, 2: 3210, 3: 39478 }
```

数据在首次调用时懒加载并常驻内存(约 4.3 万行,一次性解析)。

## 原始数据与 SQL 种子

包内同时附带原始文件,通过子路径导出:

- `cn-divisions/data/divisions.jsonl` — 规范数据,每行一个 JSON 对象,按代码排序
- `cn-divisions/sql/postgresql/divisions.sql` — 面向 `divisions` 表的批量
  `INSERT`(用 `npm run generate:sql` 重新生成)

```ts
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const sqlPath = require.resolve("cn-divisions/sql/postgresql/divisions.sql");
```

## 数据更新

修订 `data/divisions.jsonl` 后重新生成 SQL、递增版本号,并同步更新
`src/types.ts` 中的 `DATA_VERSION`。测试固定了条目数并校验 JSONL ↔ SQL
往返一致,不一致的更新会直接挂掉 CI。

## 许可

代码与数据汇编均为 MIT。数据出处、快照断代与规范化说明见
[NOTICE.md](NOTICE.md)。
