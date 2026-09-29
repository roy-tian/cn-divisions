// 一次性导入:解析上游 hr-regions.sql 种子 → 规范化 → data/divisions.jsonl。
// 用法:node scripts/import-seed.ts --source=/path/to/hr-regions.sql
//
// 规范化规则(与 NOTICE.md 一致):
// 1. 剔除"国外"伪树(91/9100/910000/910000000)——它是下游应用的过滤约定,不是行政区划;
// 2. 台湾(71)/香港(81)/澳门(82)代码保留,拼音首缀由排序标记 '~n' 修正为真实首字母。
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

interface Row {
  code: string;
  parentCode: string;
  level: number;
  name: string;
  pinyinPrefix: string;
  pinyin: string;
  fullName: string;
}

const ROW_RE =
  /^\('([^']*)', '([^']*)', (\d+), '([^']*)', '([^']*)', '([^']*)', '([^']*)'\)[,;]?$/;

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

function fail(message: string): never {
  console.error(`import-seed: ${message}`);
  process.exit(1);
}

const sourceArg = process.argv.find((a) => a.startsWith("--source="));
if (!sourceArg) {
  fail("missing --source=<path to hr-regions.sql>");
}
const sourcePath = sourceArg.slice("--source=".length);

const rows: Row[] = [];
const lines = readFileSync(sourcePath, "utf-8").split("\n");
for (let i = 0; i < lines.length; i++) {
  const line = lines[i].trim();
  if (!line.startsWith("('")) continue;
  const match = ROW_RE.exec(line);
  if (!match) {
    fail(`unparseable row at line ${i + 1}: ${line.slice(0, 120)}`);
  }
  rows.push({
    code: match[1],
    parentCode: match[2],
    level: Number(match[3]),
    name: match[4],
    pinyinPrefix: match[5],
    pinyin: match[6],
    fullName: match[7],
  });
}

const foreign = rows.filter((r) => r.code.startsWith("91"));
const kept = rows.filter((r) => !r.code.startsWith("91"));

const fixedPrefix: string[] = [];
for (const row of kept) {
  if (row.pinyinPrefix.startsWith("~")) {
    const original = row.pinyinPrefix;
    const real = row.pinyin.split(" ")[0]?.[0]?.toLowerCase() ?? "";
    if (!real) fail(`row ${row.code} has '~' pinyin prefix but empty pinyin`);
    row.pinyinPrefix = real;
    fixedPrefix.push(`${row.code} ${row.name}: ${original} -> ${real}`);
  }
}

const codes = new Set(kept.map((r) => r.code));
if (codes.size !== kept.length) fail("duplicate codes after normalization");
for (const row of kept) {
  if (row.parentCode !== "0" && !codes.has(row.parentCode)) {
    fail(`row ${row.code} references missing parent ${row.parentCode}`);
  }
  if (row.level < 0 || row.level > 3)
    fail(`row ${row.code} has level ${row.level}`);
}

kept.sort((a, b) => (a.code < b.code ? -1 : a.code > b.code ? 1 : 0));

const counts = { 0: 0, 1: 0, 2: 0, 3: 0 } as Record<number, number>;
for (const row of kept) counts[row.level] += 1;

const jsonl = kept
  .map((r) =>
    JSON.stringify({
      code: r.code,
      parentCode: r.parentCode,
      level: r.level,
      name: r.name,
      pinyinPrefix: r.pinyinPrefix,
      pinyin: r.pinyin,
      fullName: r.fullName,
    }),
  )
  .join("\n");

mkdirSync(join(repoRoot, "data"), { recursive: true });
writeFileSync(join(repoRoot, "data", "divisions.jsonl"), jsonl + "\n");

console.log(`parsed rows:      ${rows.length}`);
console.log(
  `dropped (国外):   ${foreign.length} -> ${foreign.map((r) => r.code).join(", ")}`,
);
console.log(`written:          ${kept.length} rows`);
console.log(
  `levels:           0:${counts[0]} 1:${counts[1]} 2:${counts[2]} 3:${counts[3]}`,
);
if (fixedPrefix.length > 0) {
  console.log(`fixed prefixes:\n  ${fixedPrefix.join("\n  ")}`);
}
