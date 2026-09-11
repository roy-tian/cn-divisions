import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  DATA_VERSION,
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
    "cn-divisions: data/divisions.jsonl not found relative to the package. The npm package may be broken.",
  );
}

let divisionsCache: Division[] | null = null;
let byCodeCache: Map<string, Division> | null = null;
let byParentCache: Map<string, Division[]> | null = null;

function load(): Division[] {
  if (!divisionsCache) {
    const raw = readFileSync(join(findDataDir(), "divisions.jsonl"), "utf-8");
    divisionsCache = raw
      .split("\n")
      .filter((line) => line.length > 0)
      .map((line) => JSON.parse(line) as Division);
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

/** 全量数据,按代码升序。 */
export function allDivisions(): readonly Division[] {
  return load().slice();
}

/** 按代码精确查询。 */
export function getDivision(code: string): Division | undefined {
  return byCode().get(code);
}

/** 直接子级,按代码升序;代码不存在时返回空数组。 */
export function children(code: string): Division[] {
  return byParent().get(code) ?? [];
}

/** 祖先链(从省到父级),代码不存在或为省级时返回空数组。 */
export function ancestors(code: string): Division[] {
  const chain: Division[] = [];
  let current = byCode().get(code);
  while (current && current.parentCode !== "0") {
    const parent = byCode().get(current.parentCode);
    if (!parent) break;
    chain.unshift(parent);
    current = parent;
  }
  return chain;
}

/** 以指定代码为根构建子树;代码不存在时返回 undefined。 */
export function subtree(code: string): DivisionNode | undefined {
  const root = byCode().get(code);
  if (!root) return undefined;
  const build = (d: Division): DivisionNode => ({
    ...d,
    children: children(d.code).map(build),
  });
  return build(root);
}

/** 按简称/全称子串、拼音首字母、层级组合过滤,按代码升序。 */
export function search(options: SearchOptions): Division[] {
  const name = options.name?.trim();
  const prefix = options.pinyinPrefix?.trim().toLowerCase();
  return load().filter(
    (d) =>
      (name === undefined ||
        name === "" ||
        d.name.includes(name) ||
        d.fullName.includes(name)) &&
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

export { DATA_VERSION };
