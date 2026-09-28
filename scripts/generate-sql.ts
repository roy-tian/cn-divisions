// 从 data/divisions.jsonl 生成 sql/postgresql/divisions.sql。
// 生成物,不要手改;数据修订请改 JSONL 后运行:npm run generate:sql
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import type { Division } from "../src/types.ts";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const BATCH = 500;

const q = (value: string): string => `'${value.replaceAll("'", "''")}'`;

const divisions: Division[] = readFileSync(
  join(repoRoot, "data", "divisions.jsonl"),
  "utf-8",
)
  .split("\n")
  .filter((line) => line.length > 0)
  .map((line) => JSON.parse(line) as Division);

const header = `-- Generated from data/divisions.jsonl — do not edit by hand.
-- Regenerate with: npm run generate:sql
-- Columns: code PK, parent_code, level (0 province, 1 city, 2 county, 3 township), name, pinyin_prefix, pinyin, full_name

CREATE TABLE IF NOT EXISTS "divisions" (
  "code" text PRIMARY KEY,
  "parent_code" text NOT NULL,
  "level" smallint NOT NULL CHECK ("level" BETWEEN 0 AND 3),
  "name" text NOT NULL,
  "pinyin_prefix" text NOT NULL,
  "pinyin" text NOT NULL,
  "full_name" text NOT NULL
);

CREATE INDEX IF NOT EXISTS "divisions_parent_code_idx" ON "divisions" ("parent_code");
`;

const chunks: string[] = [header];
for (let i = 0; i < divisions.length; i += BATCH) {
  const slice = divisions.slice(i, i + BATCH);
  const values = slice
    .map(
      (d) =>
        `(${[q(d.code), q(d.parentCode), d.level, q(d.name), q(d.pinyinPrefix), q(d.pinyin), q(d.fullName)].join(", ")})`,
    )
    .join(",\n");
  chunks.push(
    `INSERT INTO "divisions" ("code", "parent_code", "level", "name", "pinyin_prefix", "pinyin", "full_name") VALUES\n${values};\n`,
  );
}

mkdirSync(join(repoRoot, "sql", "postgresql"), { recursive: true });
writeFileSync(
  join(repoRoot, "sql", "postgresql", "divisions.sql"),
  chunks.join("\n"),
);

console.log(`generated sql/postgresql/divisions.sql: ${divisions.length} rows`);
