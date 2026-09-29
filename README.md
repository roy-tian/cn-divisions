# cn-divisions

[![npm](https://img.shields.io/npm/v/cn-divisions)](https://www.npmjs.com/package/cn-divisions)
[![node](https://img.shields.io/node/v/cn-divisions)](https://www.npmjs.com/package/cn-divisions)
[![dependencies](https://img.shields.io/badge/dependencies-0-brightgreen)](https://www.npmjs.com/package/cn-divisions?activeTab=dependencies)
[![module](https://img.shields.io/badge/module-ESM%20%7C%20CJS-blue)](https://www.npmjs.com/package/cn-divisions)
[![types](https://img.shields.io/npm/types/cn-divisions)](https://www.npmjs.com/package/cn-divisions)
[![license](https://img.shields.io/npm/l/cn-divisions)](LICENSE)

**中文** | [English](README_en.md)

中国行政区划数据：省、市、区县、乡镇/街道四级共 **43,114 条**，每条含拼音（全拼与首字母）和全称，附带 TypeScript 查询 API 和可直接导入的 PostgreSQL 种子 SQL。

| 级别 | 类型                        | 条目数 | 代码位数 | 示例                   |
| ---- | --------------------------- | -----: | -------: | ---------------------- |
| 0    | 省/直辖市/自治区/特别行政区 |     34 |        2 | `11` 北京市            |
| 1    | 市                          |    392 |        4 | `1101` 北京市          |
| 2    | 区/县                       |  3,210 |        6 | `110101` 东城区        |
| 3    | 乡镇/街道                   | 39,478 |        9 | `110101001` 东华门街道 |

- 代码遵循 GB/T 2260，含台湾 `71`、香港 `81`、澳门 `82`；代码位数有少数例外，见[代码与层级约定](#代码与层级约定)。
- 数据快照不早于 **2023 年 4 月**，此后的区划调整未收录，详见 [NOTICE.md](NOTICE.md)。
- 姊妹包：[`cn-patent-ipc`](https://www.npmjs.com/package/cn-patent-ipc)，中文版专利 IPC 分类数据，附战略性新兴产业（SEI）映射。

## 安装

```bash
npm install cn-divisions
```

数据文件在运行时通过 `fs` 从已安装的包目录读取，因此：

- **Yarn PnP**：请改用 `nodeLinker: node-modules`，或对本包执行 unplug（PnP 的 zip 虚拟路径不可读）。
- **打包服务端代码**（webpack、Next.js、Vite SSR、esbuild 等）：请将 `cn-divisions` 设为 external。

## 用法

| 函数                  | 说明                                                          |
| --------------------- | ------------------------------------------------------------- |
| `getDivision(code)`   | 按代码查询单条记录，未命中返回 `undefined`                    |
| `normalizeCode(code)` | 官方代码 → 包内代码                                           |
| `children(code)`      | 直接子级；传 `"0"` 返回全部省级                               |
| `ancestors(code)`     | 祖先链，从省级到父级                                          |
| `subtree(code)`       | 以该代码为根的嵌套树                                          |
| `search(options)`     | 按 `name`、`pinyin`、`pinyinPrefix`、`level` 筛选，条件取交集 |
| `allDivisions()`      | 全部记录，按代码升序                                          |
| `countByLevel()`      | 各级条目数                                                    |

另导出常量 `LEVEL_NAMES`、`DATA_VERSION` 及类型 `Division`、`DivisionNode`、`SearchOptions`、`DivisionLevel`。

```ts
import { getDivision, children, ancestors, search } from "cn-divisions";

getDivision("110101");
// { code: "110101", parentCode: "1101", level: 2, name: "东城",
//   pinyinPrefix: "d", pinyin: "dong cheng", fullName: "东城区" }
getDivision("110101001000")?.fullName; // "东华门街道"（官方十二位码）

children("0"); // 全部 34 个省级条目
ancestors("110101").map((d) => d.fullName); // ["北京市", "北京市"]（省、市同名）

search({ pinyin: "dongguan" }); // 全拼子串，忽略大小写和空格
search({ pinyinPrefix: "b", level: 0 }); // [北京]
```

- 数据在首次调用时加载并缓存在内存中。返回的记录（含 `subtree()` 节点）已冻结、类型为 `readonly`，返回的数组是拷贝，调用方无法篡改缓存。
- `search()` 遇到未知选项或类型错误的值（如 `level: "0"`）会抛出 `TypeError`，不会静默忽略。
- 拼音不带声调，音节以空格分隔。ü 记作 v（吕梁 `lv liang`），üe 记作 ue（略阳 `lue yang`）；搜索时 ü 与 v 两种写法均可。

## 代码与层级约定

- 查询函数也接受官方六位码和十二位码，精确匹配优先；无效代码（如 `130299`）返回未命中，不会退化为上级。
- 部分城市（东莞、中山、济源、仙桃等）在市与乡镇之间有同名的占位层，如 东莞市 `4419` → 东莞市 `441900`，因此 `ancestors()` 可能返回连续同名的条目，展示时请自行去重。
- 省直辖县级市和港澳的代码位数有例外，子级代码不一定以父级代码开头：请沿 `parentCode` 回溯，不要截位推算。
- 台湾没有真实的乡镇数据（级 3 为区县的同名镜像），港澳的层级结构也较特殊；三地数据比内地快照更旧，仅供参考。

完整规则见 [NOTICE.md](NOTICE.md#代码与层级约定)。

## 原始数据与 SQL

包内附带原始文件，以子路径导出，可用 `require.resolve()` 取得本地路径（ESM 中先用 `createRequire` 创建 `require`）：

- `cn-divisions/data/divisions.jsonl`：规范数据源，每行一个 JSON 对象，按代码排序。
- `cn-divisions/sql/postgresql/divisions.sql`：`divisions` 表的建表语句、`parent_code` 索引和批量 `INSERT`，可直接导入空库：

```bash
psql --single-transaction -f divisions.sql
```

已存在的代码会因主键冲突而报错，以免新旧版本数据混杂；导入新版本数据前请先 `TRUNCATE` 该表。

## 许可

代码与数据汇编均以 MIT 许可发布。数据来源、快照断代与规范化说明见 [NOTICE.md](NOTICE.md)，版本变更见 [CHANGELOG.md](CHANGELOG.md)。
