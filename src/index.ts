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
// 不坍缩到祖先。

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

function resolveCode(code: string): Division | undefined {
  for (const candidate of codeCandidates(code)) {
    const hit = byCode().get(candidate);
    if (hit) return hit;
  }
  return undefined;
}

/** 全量数据,按代码升序;数组为拷贝,记录对象已冻结。 */
export function allDivisions(): readonly Division[] {
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

/** 直接子级,按代码升序;代码不存在时返回空数组。返回数组为拷贝。 */
export function children(code: string): Division[] {
  const parent = resolveCode(code);
  if (!parent) return [];
  return (byParent().get(parent.code) ?? []).slice();
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
  const build = (d: Division): DivisionNode => {
    const node: DivisionNode = {
      ...d,
      children: (byParent().get(d.code) ?? []).map(build),
    };
    Object.freeze(node.children);
    return Object.freeze(node) as DivisionNode;
  };
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

/**
 * 按简称/全称子串、全拼子串、拼音首字母、层级组合过滤,按代码升序。
 * 传入未识别的选项键会抛 TypeError —— JS 调用方拼错字段时快速失败,
 * 而不是静默忽略该条件返回全表。
 */
export function search(options: SearchOptions): Division[] {
  for (const key of Object.keys(options)) {
    if (!SEARCH_KEYS.includes(key)) {
      throw new TypeError(
        `cn-divisions: unknown search option "${key}" (expected one of: ${SEARCH_KEYS.join(", ")})`,
      );
    }
  }
  const name = options.name?.trim();
  const pinyin = (options.pinyin ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "");
  const pinyinList = pinyin === "" ? null : normalizedPinyin();
  const prefix = options.pinyinPrefix?.trim().toLowerCase();
  return load().filter(
    (d, i) =>
      (name === undefined ||
        name === "" ||
        d.name.includes(name) ||
        d.fullName.includes(name)) &&
      (pinyinList === null || pinyinList[i].includes(pinyin)) &&
      (prefix === undefined || prefix === "" || d.pinyinPrefix === prefix) &&
      (options.level === undefined || d.level === options.level),
  );
}

/** 各层级条目数。 */
export function countByLevel(): Record<DivisionLevel, number> {
  const counts: Record<DivisionLevel, number> = { 0: 0, 1: 0, 2: 0, 3: 0 };
  for (const d of load()) counts[d.level] += 1;
  return counts;
}
