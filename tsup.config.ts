import { defineConfig } from "tsup";

// ESM 与 CJS 共用一份配置:只有一次 clean,不会与另一格式的并行构建竞态;
// dts 同时产出 index.d.ts 与 index.d.cts,CJS 使用方(module: node16)按
// require 条件拿到 CJS 类型。CJS 侧把 import.meta.url define 掉,消除 esbuild
// 的 empty-import-meta 警告(产物里 CJS 路径本就走 __dirname 分支,该表达式
// 不会执行)。
export default defineConfig({
  entry: { index: "src/index.ts" },
  format: ["esm", "cjs"],
  dts: true,
  clean: true,
  sourcemap: true,
  target: "node18",
  platform: "node",
  treeshake: false,
  esbuildOptions: (options, { format }) => {
    if (format === "cjs") {
      options.define = {
        ...options.define,
        "import.meta.url": "undefined",
      };
    }
  },
});
