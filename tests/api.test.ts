import assert from "node:assert/strict";
import test from "node:test";

import {
  allDivisions,
  ancestors,
  children,
  countByLevel,
  DATA_VERSION,
  type DivisionNode,
  getDivision,
  LEVEL_NAMES,
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

test("search maps ü input to the data's v / ue spellings", () => {
  const lvliang = search({ pinyin: "lvliang" });
  assert.ok(lvliang.some((d) => d.fullName === "吕梁市"));
  assert.deepEqual(search({ pinyin: "lüliang" }), lvliang);
  assert.deepEqual(search({ pinyin: "LÜ LIANG" }), lvliang);
  // 分解形式 u + U+0308 经 NFC 归一
  assert.deepEqual(search({ pinyin: "lu\u0308liang" }), lvliang);
  // üe 在数据中记作 ue(略阳 "lue yang")
  assert.deepEqual(
    search({ pinyin: "lüeyang" }),
    search({ pinyin: "lueyang" }),
  );
  assert.ok(search({ pinyin: "lüeyang" }).some((d) => d.name === "略阳"));
  // ü 后接 e 开头的音节仍按 v 匹配(女儿河 "nv er he")
  assert.ok(
    search({ pinyin: "nüerhe" }).some((d) => d.fullName === "女儿河街道"),
  );
});

test("search rejects unknown option keys", () => {
  assert.throws(() => search({ pinyinFull: "dong guan" } as never), TypeError);
  // 已知键的合法组合不受影响
  assert.equal(search({ pinyinPrefix: "b", level: 0 }).length, 1);
});

test("search validates option values", () => {
  const total = allDivisions().length;
  assert.equal(search().length, total);
  assert.throws(() => search(null as never), /must be an object/);
  assert.throws(() => search({ name: 1 } as never), /"name" must be a string/);
  assert.throws(() => search({ level: "0" } as never), /"level" must be 0, 1/);
  assert.throws(() => search({ level: 4 } as never), /"level" must be 0, 1/);
  assert.throws(() => search({ level: 1.5 } as never), TypeError);
  // 继承属性与 getter 同样经过校验
  assert.throws(
    () => search(Object.create({ level: "0" }) as never),
    /"level" must be 0, 1/,
  );
  assert.throws(
    () =>
      search({
        get name() {
          return 1;
        },
      } as never),
    /"name" must be a string/,
  );
  // undefined / null 视为未设置
  assert.equal(search({ name: undefined, level: undefined }).length, total);
  assert.equal(search({ name: null, level: null }).length, total);
});

test("returned records are frozen and arrays are copies", () => {
  assert.throws(() => {
    (getDivision("11") as { name?: string } | undefined)!.name = "x";
  });
  const kids = children("11");
  kids.pop();
  assert.equal(children("11").length, 1);
  const total = allDivisions().length;
  const all = allDivisions();
  all.pop();
  assert.equal(allDivisions().length, total);
  const tree = subtree("11")!;
  assert.throws(() => {
    (tree.children[0] as { name: string }).name = "x";
  });
  assert.throws(() => {
    (tree.children as DivisionNode[]).pop();
  });
  assert.throws(() => {
    (LEVEL_NAMES as Record<number, string>)[0] = "x";
  });
});

test("children('0') lists the province-level entries", () => {
  const provinces = children("0");
  assert.equal(provinces.length, countByLevel()[0]);
  assert.ok(provinces.every((d) => d.level === 0));
  assert.equal(provinces[0].code, "11");
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
  assert.equal(getDivision("419001000000")?.code, "419001000"); // 济源九位占位层
  // 县聚集码不被县下编号恰为 000 的级 3 记录劫持:非标乡镇
  assert.equal(getDivision("150524000000")?.code, "150524"); // 库伦旗,非 150524000 库伦街道
  assert.equal(getDivision("320508000000")?.code, "320508"); // 姑苏区
  // ……以及无下级的同名级 3 副本
  assert.equal(getDivision("460301000000")?.code, "460301"); // 西沙区(级 2)
  assert.equal(getDivision("710101000000")?.code, "710101"); // 中正区(级 2)
  assert.equal(getDivision("710101000")?.level, 3); // 九位精确查询仍命中副本
  // 父级不是同码六位县的九位记录照常命中(港澳区级)
  assert.equal(getDivision("810101000000")?.code, "810101000");

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
  assert.equal(normalizeCode("150524000000"), "150524");
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
