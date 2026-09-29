// 冒烟测试打包产物(dist/)的 CJS 与 ESM 两个入口,CI 在各受支持的 Node 版本上
// 运行。刻意写成纯 JS:需在 Node 18 上直接执行,不能依赖 type stripping。
// 用法:npm run build && node scripts/smoke-dist.mjs
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const entries = {
  cjs: require("../dist/index.cjs"),
  esm: await import("../dist/index.js"),
};

for (const [format, m] of Object.entries(entries)) {
  assert.equal(m.getDivision("110000")?.fullName, "北京市");
  assert.equal(m.normalizeCode("110101001000"), "110101001");
  assert.deepEqual(
    m.ancestors("110101001").map((d) => d.code),
    ["11", "1101", "110101"],
  );
  assert.equal(m.children("0").length, m.countByLevel()[0]);
  assert.equal(m.subtree("1310")?.fullName, "廊坊市");
  assert.ok(m.search({ pinyin: "dong guan" }).some((d) => d.name === "东莞"));
  assert.ok(Object.isFrozen(m.getDivision("11")));
  console.log(`${format} ok (node ${process.versions.node})`);
}
