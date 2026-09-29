# cn-divisions

中国行政区划数据包:省、市、区县、乡镇/街道四级共 **43,114 条**,每条含拼音
(全拼 + 首字母)与全称,零运行时依赖,附带 TypeScript 查询 API 与可直接执行的
PostgreSQL 种子 SQL。[English](README.md)

- 各级条目:34 省/直辖市/自治区/特别行政区 · 392 市 · 3,210 区/县 · 39,478 乡镇/街道
- 代码遵循 GB/T 2260 体系,含台湾 `71`、香港 `81`、澳门 `82`
- 快照按行政区划变更标志物断代为 **2023 年 4 月及之后** — 该下界之后的
  区划调整**不在本包内**,详见 [NOTICE.md](NOTICE.md)
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
  normalizeCode,
} from "cn-divisions";

getDivision("110101");
// { code: "110101", parentCode: "1101", level: 2, name: "东城",
//   pinyinPrefix: "d", pinyin: "dong cheng", fullName: "东城区" }

// 查询函数还接受官方全码:GB/T 2260 六位码、统计局十二位码(精确/长码优先)
getDivision("110000")?.fullName; // "北京市"(→ 包内码 "11")
getDivision("110101001000")?.fullName; // "东华门街道"(→ "110101001")
normalizeCode("131000"); // "1310"(官方码 → 包内码)

children("1310").map((d) => d.fullName); // 廊坊市下辖: 三河市、香河县, …
children("0"); // 全部 34 个省级条目
ancestors("110101").map((d) => d.fullName); // [ "北京市", "北京市" ]
subtree("11"); // 北京下的嵌套树
search({ name: "三河" }); // 简称/全称子串匹配
search({ pinyin: "dong guan" }); // 全拼子串,忽略大小写与空格("dongguan" 同样命中)
search({ pinyin: "lüliang" }); // 数据中 ü 记作 v("lv liang"),两种写法均可
search({ pinyinPrefix: "b", level: 0 }); // [ 北京 ]
countByLevel(); // { 0: 34, 1: 392, 2: 3210, 3: 39478 }
```

数据在首次调用时懒加载并常驻内存(约 4.3 万行,一次性解析)。返回的记录对象
已冻结(含 `subtree()` 节点)且类型标为 `readonly`、数组为拷贝,外部修改不会
污染缓存。`search()` 遇到未知选项键或类型错误的值(如 `level: "0"`)会抛
`TypeError`,而不是静默忽略。

拼音无声调、按音节以空格分隔。ü 记作 v(吕梁 `lv liang`),üe 按拼写惯例记作
ue(略阳 `lue yang`)。

## 代码与层级口径

- **包内代码位数**:省 2 位(`"11"`)、市 4 位(`"1101"`)、区县 6 位
  (`"110101"`)、乡镇/街道 9 位(`"110101001"`)。所有查询函数均额外接受
  官方六位/十二位全码(见上),精确匹配优先。裁剪只认官方后缀形状——
  省级尾 `0000`、市级尾 `00`、统计局乡镇码尾 `000`(十二位 → 九位)、统计局
  县聚集码尾 `000000`;无效代码(如 `"130299"`、`"110101999000"`)返回未命中,
  不坍缩到祖先。县下若有编号恰为 `000` 的级 3 记录,县聚集码仍落到县本身
  ——无论是乡镇(`150524000000` → 库伦旗 `150524`,而非库伦街道 `150524000`)
  还是同名副本(`710101000000` → 中正区 `710101`);只有级 2 占位层保留九位
  命中(`419001000000` → `419001000`)。
- **不设区的地级市与省直辖县级市**:东莞、中山、儋州,以及济源、仙桃、潜江、
  天门、新疆兵团城市、海南省直辖县级市等,在市(级 1)与乡镇(级 3)之间保留
  一个同名占位层(级 2),如 东莞市 `4419` → 东莞市 `441900` → 街道;
  `ancestors()` 可能返回连续同名条目,展示时请自行去重。这些县级市在包内
  标记为级 1(市),与官方县级身份不同;其官方十二位全码命中同名占位层
  (`441900000000` → `441900`,级 2)。
- **代码位数的例外**:省直辖县级市在级 1 保留官方六位码,其占位层用九位
  `…000` 码(济源市 `419001` → 济源市 `419001000` → 沁园街道 `419001001`);
  港澳的区挂在六位中间层下、用九位码(`810000` → `810101000`)。因此子级
  代码不一定以父级代码为前缀——请沿 `parentCode` 回溯,不要截位推算。
- **台湾/香港/澳门**:台湾有 20 个市/县与 358 个区/乡/镇/县辖市(级 2),
  每个都对应一条同名的级 3 镜像(中正区 `710101` → `710101000`),没有真实的
  乡镇数据;香港、澳门为特别行政区 → 两层同名中间层(`8100`、`810000`)→
  区(澳门为堂区)的链路。由于精确匹配优先,官方码 `810000`/`820000` 命中
  级 2 中间层,而不是 `81`/`82`。三地(`71`/`81`/`82`)子级数据口径较旧,
  仅作参考。
- **数据时效**:快照断代仅有下界(≥ 2023-04,见 [NOTICE.md](NOTICE.md)),
  此后的撤县设区、乡镇合并等变更不在本包内。

## 原始数据与 SQL 种子

包内同时附带原始文件,通过子路径导出:

- `cn-divisions/data/divisions.jsonl` — 规范数据,每行一个 JSON 对象,按代码排序
- `cn-divisions/sql/postgresql/divisions.sql` — 面向 `divisions` 表的批量
  `INSERT`,文件开头附带 `CREATE TABLE IF NOT EXISTS` 与 `parent_code` 索引,
  对空库可直接执行(用 `npm run generate:sql` 重新生成)。可用
  `psql --single-transaction -f divisions.sql` 原子导入。已存在的代码会因主键
  冲突报错,而不是让两个版本的数据悄悄混在一起;要换成新版本数据,请先
  `TRUNCATE` 该表。

```ts
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const sqlPath = require.resolve("cn-divisions/sql/postgresql/divisions.sql");
```

## 数据更新

修订 `data/divisions.jsonl` 后重新生成 SQL、递增版本号,并同步更新
`src/types.ts` 中的 `DATA_VERSION` 与 [CHANGELOG.md](CHANGELOG.md)。测试固定了
条目数并校验 JSONL ↔ SQL 往返一致,不一致的更新会直接挂掉 CI。

## 开发

运行时支持 Node ≥ 18;开发与测试需要 **Node ≥ 23.6** —— 测试直接运行 `.ts`
文件,依赖原生 type stripping。Yarn PnP 用户请改用
`nodeLinker: node-modules`(或 unplug 本包):数据文件经 `fs` 读取,PnP 的
zip 虚拟路径不可读。同理,用打包工具(webpack、Next.js、Vite SSR、esbuild)
打包服务端代码时请把 `cn-divisions` 设为 external——数据文件在运行时相对
已安装的包目录定位。

## 许可

代码与数据汇编均为 MIT。数据出处、快照断代与规范化说明见
[NOTICE.md](NOTICE.md);变更记录见 [CHANGELOG.md](CHANGELOG.md)。
