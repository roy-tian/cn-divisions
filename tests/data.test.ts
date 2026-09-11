import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { allDivisions, countByLevel, getDivision } from "../src/index.ts";

const divisions = allDivisions();

test("snapshot size and per-level counts", () => {
  assert.equal(divisions.length, 43_114);
  assert.deepEqual(countByLevel(), { 0: 34, 1: 392, 2: 3_210, 3: 39_478 });
});

test("rows are sorted by code", () => {
  for (let i = 1; i < divisions.length; i++) {
    assert.ok(divisions[i - 1].code < divisions[i].code);
  }
});

test("spot checks", () => {
  assert.deepEqual(
    { ...getDivision("11") },
    {
      code: "11",
      parentCode: "0",
      level: 0,
      name: "北京",
      pinyinPrefix: "b",
      pinyin: "bei jing",
      fullName: "北京市",
    },
  );
  assert.equal(getDivision("110101")?.fullName, "东城区");
  assert.equal(getDivision("131082")?.fullName, "三河市");
  assert.equal(getDivision("71")?.fullName, "台湾省");
  assert.equal(getDivision("81")?.fullName, "香港特别行政区");
  assert.equal(getDivision("82")?.fullName, "澳门特别行政区");
});

test("normalization dropped the foreign pseudo tree and tilde prefixes", () => {
  assert.ok(!divisions.some((d) => d.code.startsWith("91")));
  assert.ok(!divisions.some((d) => d.pinyinPrefix.startsWith("~")));
  assert.equal(getDivision("71")?.pinyinPrefix, "t");
  assert.equal(getDivision("81")?.pinyinPrefix, "x");
  assert.equal(getDivision("82")?.pinyinPrefix, "a");
});

test("every parent reference exists and is one level up", () => {
  const codes = new Map(divisions.map((d) => [d.code, d]));
  for (const d of divisions) {
    if (d.parentCode === "0") {
      assert.equal(d.level, 0);
      continue;
    }
    const parent = codes.get(d.parentCode);
    assert.ok(parent, `missing parent ${d.parentCode} for ${d.code}`);
    assert.equal(parent.level, d.level - 1, `level gap at ${d.code}`);
  }
});

test("pinyin prefix matches the first pinyin syllable", () => {
  for (const d of divisions) {
    const first = d.pinyin.split(" ")[0];
    assert.ok(first, `empty pinyin at ${d.code}`);
    assert.equal(
      d.pinyinPrefix,
      first[0].toLowerCase(),
      `prefix mismatch at ${d.code}`,
    );
  }
});

test("committed SQL matches the JSONL payload (round trip)", () => {
  const sql = readFileSync(
    new URL("../sql/postgresql/divisions.sql", import.meta.url),
    "utf-8",
  );
  const rowRe =
    /^\('([^']*)', '([^']*)', (\d+), '([^']*)', '([^']*)', '([^']*)', '([^']*)'\)[,;]?$/gm;
  const fromSql: unknown[] = [];
  for (const match of sql.matchAll(rowRe)) {
    fromSql.push({
      code: match[1],
      parentCode: match[2],
      level: Number(match[3]),
      name: match[4],
      pinyinPrefix: match[5],
      pinyin: match[6],
      fullName: match[7],
    });
  }
  assert.equal(fromSql.length, divisions.length);
  assert.deepEqual(fromSql, divisions as unknown[]);
});
