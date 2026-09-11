import assert from "node:assert/strict";
import test from "node:test";

import {
  allDivisions,
  ancestors,
  children,
  countByLevel,
  DATA_VERSION,
  getDivision,
  search,
  subtree,
} from "../src/index.ts";

test("ancestors walks up to the province", () => {
  assert.deepEqual(
    ancestors("110101").map((d) => d.code),
    ["11", "1101"],
  );
  assert.deepEqual(ancestors("11"), []);
  assert.deepEqual(ancestors("999999"), []);
});

test("children returns direct children sorted by code", () => {
  const codes = children("11").map((d) => d.code);
  assert.deepEqual(codes, ["1101"]);
  const hebei = children("13").map((d) => d.code);
  assert.ok(hebei.length > 10);
  assert.ok(hebei.includes("1310"));
  assert.deepEqual(children("999999"), []);
});

test("subtree nests descendants", () => {
  const langfang = subtree("1310");
  assert.ok(langfang);
  assert.equal(langfang.fullName, "廊坊市");
  const sanhe = langfang.children.find((c) => c.code === "131082");
  assert.ok(sanhe);
  assert.equal(sanhe.fullName, "三河市");
  assert.equal(subtree("999999"), undefined);
});

test("search filters by name, pinyin prefix and level", () => {
  const sanhe = search({ name: "三河" });
  assert.ok(sanhe.some((d) => d.code === "131082"));
  assert.ok(
    sanhe.every((d) => d.name.includes("三河") || d.fullName.includes("三河")),
  );

  const bProvinces = search({ pinyinPrefix: "b", level: 0 });
  assert.deepEqual(
    bProvinces.map((d) => d.code),
    ["11"],
  );

  assert.deepEqual(search({ name: "不存在的地名XYZ" }), []);
});

test("countByLevel sums to the total", () => {
  const counts = countByLevel();
  const total = counts[0] + counts[1] + counts[2] + counts[3];
  assert.equal(total, allDivisions().length);
});

test("DATA_VERSION is exposed", () => {
  assert.equal(typeof DATA_VERSION, "string");
  assert.ok(DATA_VERSION.length > 0);
});
