import assert from "node:assert/strict";
import test from "node:test";

import {
  allDivisions,
  ancestors,
  children,
  countByLevel,
  DATA_VERSION,
  type Division,
  getDivision,
  normalizeCode,
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

test("search matches full pinyin, space and case insensitive", () => {
  const spaced = search({ pinyin: "dong guan" });
  assert.ok(spaced.some((d) => d.name === "东莞"));
  assert.deepEqual(search({ pinyin: "dongguan" }), spaced);
  assert.deepEqual(search({ pinyin: "DONG GUAN" }), spaced);
  // 前缀子串同样命中
  assert.ok(search({ pinyin: "dongg" }).some((d) => d.name === "东莞"));
  assert.deepEqual(search({ pinyin: "bu cun zai de yin xyz" }), []);
});

test("search rejects unknown option keys", () => {
  assert.throws(() => search({ pinyinFull: "dong guan" } as never), TypeError);
  // 已知键的合法组合不受影响
  assert.equal(search({ pinyinPrefix: "b", level: 0 }).length, 1);
});

test("returned records are frozen and arrays are copies", () => {
  assert.throws(() => {
    (getDivision("11") as { name?: string } | undefined)!.name = "x";
  });
  const kids = children("11");
  kids.pop();
  assert.equal(children("11").length, 1);
  const all = allDivisions() as unknown as Division[];
  all.pop();
  assert.equal(allDivisions().length, 43_114);
  const tree = subtree("11")!;
  assert.throws(() => {
    tree.children[0].name = "x";
  });
  assert.throws(() => {
    tree.children.pop();
  });
});

test("official 6/12-digit codes resolve to package codes", () => {
  assert.equal(getDivision("110000")?.code, "11"); // 北京(GB/T 2260 省码)
  assert.equal(getDivision("131000")?.code, "1310"); // 廊坊
  assert.equal(getDivision("110101001000")?.code, "110101001"); // 东华门街道(12 位)
  // 精确匹配优先于裁剪:东莞县级占位码 441900 不得坍缩为市级 4419
  assert.equal(getDivision("441900")?.level, 2);
  // 村级 12 位码不属于本数据,不应误命中其父级
  assert.equal(getDivision("110101001001"), undefined);
  // 县聚集码(乡镇位全零)下探六位县级
  assert.equal(getDivision("110101000000")?.code, "110101");
  // 无效代码不坍缩到祖先:不存在的县/乡镇码返回未命中
  assert.equal(getDivision("130299"), undefined); // 不得命中市级 1302 唐山
  assert.equal(getDivision("110199"), undefined);
  assert.equal(getDivision("110101999000"), undefined); // 乡镇 999 不存在,不落穿到县级
  assert.deepEqual(children("130299"), []);
  // 不设区城市的十二位全码命中同名占位层(见 NOTICE.md 占位层约定)
  assert.equal(getDivision("441900000000")?.code, "441900");
  assert.equal(getDivision("441900000000")?.level, 2);

  assert.deepEqual(
    children("110000").map((d) => d.code),
    ["1101"],
  );
  assert.deepEqual(
    ancestors("110101001000").map((d) => d.code),
    ["11", "1101", "110101"],
  );
  assert.equal(subtree("110000")?.fullName, "北京市");
});

test("normalizeCode maps official codes and falls back by length rules", () => {
  assert.equal(normalizeCode("110000"), "11");
  assert.equal(normalizeCode("131000"), "1310");
  assert.equal(normalizeCode("110101001000"), "110101001");
  assert.equal(normalizeCode("110101"), "110101");
  assert.equal(normalizeCode("441900"), "441900");
  assert.equal(normalizeCode("990000"), "99"); // 无法识别 → 按位数规则裁剪
  assert.equal(normalizeCode("110101001001"), "110101001001");
  assert.equal(normalizeCode("130299"), "130299");
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
