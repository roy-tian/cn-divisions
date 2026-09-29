import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  type Division,
  type DivisionLevel,
  type DivisionNode,
  type SearchOptions,
} from "./types.ts";

export * from "./types.ts";

// 从模块所在目录逐级向上定位 data/,兼容四种布局:源码运行(src/)、tsup 打包后的
// ESM 与 CJS 产物(dist/)、以及被安装到 node_modules 的包根目录。
// __dirname 在 CJS 产物中存在;ESM 下 import.meta.url 才可用,两者择一。
function moduleDir(): string {
  if (typeof __dirname === "string") {
    return __dirname;
  }
  return dirname(fileURLToPath(import.meta.url));
}

function findDataDir(): string {
  let dir = moduleDir();
  for (let i = 0; i < 6; i++) {
    if (existsSync(join(dir, "data", "divisions.jsonl"))) {
      return join(dir, "data");
    }
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  throw new Error(
    "cn-divisions: data/divisions.jsonl not found relative to the package. " +
      "The npm package may be broken. If you are using Yarn PnP, switch to " +
      "nodeLinker: node-modules or unplug this package (the data file is read " +
      "via fs, and PnP zip virtual paths are not readable).",
  );
}

let divisionsCache: Division[] | null = null;
let byCodeCache: Map<string, Division> | null = null;
let byParentCache: Map<string, Division[]> | null = null;
let normalizedPinyinCache: string[] | null = null;
let levelIndexCache: number[][] | null = null;

function load(): Division[] {
  if (!divisionsCache) {
    const raw = readFileSync(join(findDataDir(), "divisions.jsonl"), "utf-8");
    // 冻结记录:外部对返回对象的赋值会抛 TypeError(ESM/严格模式),防止污染缓存。
    divisionsCache = raw
      .split("\n")
      .filter((line) => line.length > 0)
      .map((line) => Object.freeze(JSON.parse(line) as Division));
  }
  return divisionsCache;
}

function byCode(): Map<string, Division> {
  if (!byCodeCache) {
    byCodeCache = new Map(load().map((d) => [d.code, d]));
  }
  return byCodeCache;
}

function byParent(): Map<string, Division[]> {
  if (!byParentCache) {
    const map = new Map<string, Division[]>();
    for (const d of load()) {
      const list = map.get(d.parentCode);
      if (list) list.push(d);
      else map.set(d.parentCode, [d]);
    }
    for (const list of map.values()) {
      list.sort((a, b) => (a.code < b.code ? -1 : a.code > b.code ? 1 : 0));
    }
    byParentCache = map;
  }
  return byParentCache;
}

// 包内代码位数:省 2、市 4、区县 6、乡镇 9。官方公布通常是省/市/县共用六位
// (GB/T 2260,如 110000/131000)或乡镇十二位(统计局码尾接 "000")。这里生成
// "原始输入在前、裁剪候选在后"的序列:精确匹配永远优先,不会被裁剪劫持——
// 例如东莞的县级占位码 441900 必须精确命中,而不是坍缩为市级 4419。裁剪只
// 认官方后缀形状:六位省级(尾 0000)取两位、市级(尾 00)取四位;十二位仅当
// 乡镇位全零才下探六位县级;无效代码(如 130299、110101999000)返回未命中,
// 不坍缩到祖先。县聚集码的九位候选若是县下编号恰为 000 的级 3 记录,则让位
// 给县本身(见 shadowsCounty)。

// 官方形状的后缀裁剪规则:六位省级尾 0000 → 前两位,市级尾 00 → 前四位,
// 统计局十二位尾 000 → 前九位;其余形状无裁剪规则,返回 undefined。
function officialTrim(code: string): string | undefined {
  if (code.length === 6) {
    if (code.endsWith("0000")) return code.slice(0, 2);
    if (code.endsWith("00")) return code.slice(0, 4);
  }
  if (code.length === 12 && code.endsWith("000")) return code.slice(0, 9);
  return undefined;
}

function codeCandidates(code: string): string[] {
  if (code.length === 12 && code.endsWith("000")) {
    // 统计局十二位码:乡镇位全零的县聚集码(110101000000)下探六位县级;
    // 乡镇位非零时只试九位乡镇本身(110101999000 不坍缩到县级)。
    if (code.slice(6) === "000000") {
      return [code, code.slice(0, 9), ...codeCandidates(code.slice(0, 6))];
    }
    return [code, code.slice(0, 9)];
  }
  const trim = officialTrim(code);
  return trim === undefined ? [code] : [code, trim];
}

// 县聚集码(十二位、乡镇位全零)的含义是"县本身",但其九位候选 xxxxxx000 可能
// 恰是该县下一条级 3 记录:非标乡镇(库伦旗 150524 下的 150524000 库伦街道),
// 或无下级的同名副本(台湾各区、三沙西沙/南沙,如 710101 → 710101000)。此时
// 聚集码落到县本身。只有级 2 占位层(县级市济源 419001 → 419001000)或父级
// 并非该县(港澳 810101000)时,九位候选才保留优先。十二位查询每次命中都经过
// 这里,所以只用 endsWith/startsWith 比较、不切片分配新串,并把最常失败的
// 长度与后缀判断放在最前。
function shadowsCounty(code: string, hit: Division): boolean {
  return (
    code.length === 12 &&
    code.endsWith("000000") &&
    hit.level === 3 &&
    hit.code.length === 9 &&
    hit.parentCode.length === 6 &&
    code.startsWith(hit.code) &&
    code.startsWith(hit.parentCode)
  );
}

function resolveCode(code: string): Division | undefined {
  for (const candidate of codeCandidates(code)) {
    const hit = byCode().get(candidate);
    if (hit && !shadowsCounty(code, hit)) return hit;
  }
  return undefined;
}

/** 全量数据,按代码升序;数组为拷贝,记录对象已冻结。 */
export function allDivisions(): Division[] {
  return load().slice();
}

/**
 * 按代码查询;除包内代码外,还接受官方 GB/T 2260 六位码(如 "110000")与
 * 统计局十二位码(如 "110101001000"),精确/长码匹配优先。无效代码不会
 * 坍缩到祖先;不设区城市(东莞等)的十二位全码命中同名占位层
 * (441900000000 → 441900,级 2),占位层约定见 NOTICE.md。
 */
export function getDivision(code: string): Division | undefined {
  return resolveCode(code);
}

/**
 * 官方区划代码 → 包内代码:接受 GB/T 2260 六位码与统计局十二位码,命中数据时
 * 返回包内代码(精确优先);无法识别时按位数规则裁剪后原样返回,不抛错。
 * 数据在首次调用时加载。
 */
export function normalizeCode(code: string): string {
  const hit = resolveCode(code);
  if (hit) return hit.code;
  return officialTrim(code) ?? code;
}

/**
 * 直接子级,按代码升序;传 "0"(省级记录的 parentCode)返回全部省级。代码
 * 不存在时返回空数组。返回数组为拷贝。
 */
export function children(code: string): Division[] {
  const parentCode = code === "0" ? code : resolveCode(code)?.code;
  if (parentCode === undefined) return [];
  return (byParent().get(parentCode) ?? []).slice();
}

/** 祖先链(从省到父级),代码不存在或为省级时返回空数组。 */
export function ancestors(code: string): Division[] {
  const chain: Division[] = [];
  let current = resolveCode(code);
  while (current && current.parentCode !== "0") {
    const parent = byCode().get(current.parentCode);
    if (!parent) break;
    chain.unshift(parent);
    current = parent;
  }
  return chain;
}

/** 以指定代码为根构建子树;代码不存在时返回 undefined。节点与 children 数组均已冻结。 */
export function subtree(code: string): DivisionNode | undefined {
  const root = resolveCode(code);
  if (!root) return undefined;
  const build = (d: Division): DivisionNode =>
    Object.freeze({
      ...d,
      children: Object.freeze((byParent().get(d.code) ?? []).map(build)),
    });
  return build(root);
}

// 选项键白名单,与 SearchOptions 的键一一对应(satisfies 保证新增选项漏更
// 此表时编译失败,而不是 search 误抛新键)。
const SEARCH_KEYS: readonly string[] = Object.keys({
  name: true,
  pinyin: true,
  pinyinPrefix: true,
  level: true,
} satisfies Record<keyof SearchOptions, true>);

// 规范化全拼(小写、去空格),与 load() 索引对齐,首次使用时构建:
// pinyin 过滤不再每次调用对全表逐行重新规范化。
function normalizedPinyin(): string[] {
  if (!normalizedPinyinCache) {
    normalizedPinyinCache = load().map((d) =>
      d.pinyin.toLowerCase().replace(/\s+/g, ""),
    );
  }
  return normalizedPinyinCache;
}

// 各层级在 load() 中的行下标(升序),首次按层级搜索时构建:带 level 条件的
// search 只遍历该层候选,不扫全表。存下标而非记录,是为了与 normalizedPinyin()
// 对齐;升序保证结果仍按代码排序。
function levelIndex(): number[][] {
  if (!levelIndexCache) {
    const buckets: number[][] = [[], [], [], []];
    load().forEach((d, i) => buckets[d.level].push(i));
    levelIndexCache = buckets;
  }
  return levelIndexCache;
}

function describeValue(value: unknown): string {
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "number") return String(value);
  return typeof value;
}

function readString(key: string, value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "string") {
    throw new TypeError(
      `cn-divisions: search option "${key}" must be a string (got ${describeValue(value)})`,
    );
  }
  return value;
}

function readLevel(value: unknown): DivisionLevel | undefined {
  if (value === undefined || value === null) return undefined;
  if (
    typeof value !== "number" ||
    !Number.isInteger(value) ||
    value < 0 ||
    value > 3
  ) {
    throw new TypeError(
      `cn-divisions: search option "level" must be 0, 1, 2 or 3 (got ${describeValue(value)})`,
    );
  }
  return value as DivisionLevel;
}

// 面向 JS 调用方的运行时校验:选项必须是对象,键须在白名单内,字符串选项须为
// 字符串,level 须为 0–3。拼错字段或传错类型时抛 TypeError 快速失败,而不是
// 静默忽略该条件返回全表,或静默返回空数组(如 level: "0")。四个选项各只
// 读取一次,校验的就是过滤要用的那份值——继承属性与 getter 也逃不过校验。
function readSearchOptions(options: unknown): {
  name: string | undefined;
  pinyin: string | undefined;
  pinyinPrefix: string | undefined;
  level: DivisionLevel | undefined;
} {
  if (typeof options !== "object" || options === null) {
    throw new TypeError(
      `cn-divisions: search options must be an object (got ${options === null ? "null" : typeof options})`,
    );
  }
  for (const key of Object.keys(options)) {
    if (!SEARCH_KEYS.includes(key)) {
      throw new TypeError(
        `cn-divisions: unknown search option "${key}" (expected one of: ${SEARCH_KEYS.join(", ")})`,
      );
    }
  }
  const { name, pinyin, pinyinPrefix, level } = options as Record<
    string,
    unknown
  >;
  return {
    name: readString("name", name),
    pinyin: readString("pinyin", pinyin),
    pinyinPrefix: readString("pinyinPrefix", pinyinPrefix),
    level: readLevel(level),
  };
}

// 查询全拼的匹配形式。数据中 ü 记作 v(吕梁 "lv liang"),但 üe 记作 ue
// (略阳 "lue yang");去掉空格后分不清 üe 与"ü + e 开头的音节"(女儿河
// "nv er he"),所以两种改写都保留,任一命中即可。先做 NFC,让分解形式的
// u + U+0308 也归一为 ü。
function pinyinQueries(input: string): [] | [string] | [string, string] {
  const compact = input
    .normalize("NFC")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "");
  if (compact === "") return [];
  const asV = compact.replaceAll("ü", "v");
  const asUe = compact.replaceAll("üe", "ue").replaceAll("ü", "v");
  return asUe === asV ? [asV] : [asV, asUe];
}

/**
 * 按简称/全称子串、全拼子串、拼音首字母、层级组合过滤,按代码升序;不传
 * 条件时返回全表拷贝。选项键或值类型不合法时抛 TypeError(见
 * readSearchOptions)。
 */
export function search(options: SearchOptions = {}): Division[] {
  const opts = readSearchOptions(options);
  const name = opts.name?.trim();
  // 至多两个拼音候选,在过滤条件里直接展开:不用 queries.some(q => ...),因为
  // 回调里捕获行下标的闭包会让 V8 为全表每一行分配上下文(即使本次没有拼音
  // 条件),逐行调用辅助函数也有可测开销。
  const [pinyin, pinyinAlt] = pinyinQueries(opts.pinyin ?? "");
  const pinyinList = pinyin === undefined ? [] : normalizedPinyin();
  const prefix = opts.pinyinPrefix?.trim().toLowerCase();
  const level = opts.level;
  const rows = load();
  // 单行判定,每次调用只创建一次;层级由候选集保证,这里不再检查。名称只查
  // fullName:数据中全称总包含简称(tests/data.test.ts 固定此约束),简称的
  // 子串必然也是全称的子串,省去每行一次 name.includes。
  const matches = (d: Division, i: number): boolean =>
    (name === undefined || name === "" || d.fullName.includes(name)) &&
    (pinyin === undefined ||
      pinyinList[i].includes(pinyin) ||
      (pinyinAlt !== undefined && pinyinList[i].includes(pinyinAlt))) &&
    (prefix === undefined || prefix === "" || d.pinyinPrefix === prefix);
  if (level === undefined) return rows.filter(matches);
  const result: Division[] = [];
  for (const i of levelIndex()[level]) {
    if (matches(rows[i], i)) result.push(rows[i]);
  }
  return result;
}

/** 各层级条目数。 */
export function countByLevel(): Record<DivisionLevel, number> {
  const counts: Record<DivisionLevel, number> = { 0: 0, 1: 0, 2: 0, 3: 0 };
  for (const d of load()) counts[d.level] += 1;
  return counts;
}
