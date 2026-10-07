# 来源清单 / Source ledger

本清单记录维护政策依据及今后数据变更的证据，不补造历史来源。
This ledger records policy references and evidence for future data changes;
it does not reconstruct undocumented historical provenance.

规则见 [NOTICE.md](../NOTICE.md#后续变更的证据要求) /
[NOTICE_en.md](../NOTICE_en.md#evidence-required-for-future-changes).
每个数据 PR 须追加记录并链接其标题；维护者在合并前人工核对证据。
Every data PR must append entries and link their headings; maintainers must
review the evidence before merging. This is a manual review requirement,
not an automated authenticity check.

## 既有快照 / Existing snapshot

- **标记 / Marker**: `snapshot-2023`.
- **范围 / Scope**: 43,114 条 / rows; levels 0/1/2/3 = 34/392/3,210/39,478.
- **直接来源 / Immediate source**: 下游项目种子导出 / downstream seed dump.
- **原始链接、发布机构及发布日期 / Original URL, publisher and publication date**:
  未记载 / undocumented.
- **日期限制 / Date limitation**: 内地区划变更标志物仅支持 ≥ 2023-04 的下界，
  不证明所有记录在同一时点有效；台湾、香港、澳门数据更旧。
  Mainland change markers establish only a lower bound of April 2023, not
  a common effective date for every row; Taiwan/Hong Kong/Macau data is older.
- **本次处理 / Treatment here**: 保留现有数据；没有重新验证或刷新任何记录。
  Existing data retained; no records reverified or refreshed by this policy change.

## NBS-2025-08-25 — 政策依据 / Policy reference

- **发布机构 / Publisher**: 国家统计局统计设计管理司 / NBS Department of
  Statistical Design and Management.
- **标题 / Title**: 请问最新的统计用区划代码和城乡划分代码在哪里查看？
- **原始公开链接 / Original public URL**:
  <https://www.stats.gov.cn/hd/lyzx/zxgk/202509/t20250903_1960996.html>
- **官方答复日期 / Official reply date**: 2025-08-25.
- **网页发布日期 / Page publication date**: 页面正文未单列，不根据 URL 推定。
  Not separately stated in the page body; not inferred from the URL.
- **政策起始时间 / Policy applies from**: 2024-10.
- **访问日期 / Accessed**: 2026-10-08.
- **覆盖范围 / Coverage**: 国家统计局具体统计用区划代码和城乡划分代码的
  公开可用性；包括乡级更新过去依赖的公开来源。
  Public availability of specific NBS statistical division and urban/rural
  classification codes, including the historical source for township updates.
- **支持的结论 / Supports**: 具体代码停止公开，相关标准方法继续公开。
  Specific codes no longer publicly disclosed; related standards and methods remain public.
- **不支持的结论 / Does not support**: 任何区划记录或代码的新增、删除、修改，
  或新的全量快照日期 / any addition, deletion or modification of a division
  record or code, or a new full-snapshot date.

## 数据变更记录模板 / Data change entry template

目前没有新增数据变更记录。后续复制以下模板，每个来源及实际层级分别记录；
同一来源覆盖多个层级时分项列明。保留旧记录，新证据以新记录引用旧记录。
There are no new data-change entries yet. Copy this template for each source
and actual level (list levels separately when one source spans several).
Preserve earlier entries and reference them from new evidence.

```markdown
### <唯一标识 / unique entry ID>

- 发布机构 / Publisher:
- 标题 / Title:
- 原始公开 URL / Original public URL:
- 发布日期 / Publication date: YYYY-MM-DD（未知时说明原因 / explain if unknown）
- 数据时点或生效日期 / Data reference or effective date: （未注明时写未注明 / state if not given）
- 访问日期 / Access date: YYYY-MM-DD
- 实际行政层级及包内 level / Actual administrative level and package level:
- 地域覆盖范围 / Geographic coverage:
- 支持的字段 / Supported fields:
- 证据定位 / Evidence location: （条款、表行、页码等 / clause, table row, page, etc.）
- 受影响代码及变更前后值 / Affected codes and before/after values:
  （新增与删除也须列明；批量更新可链接仓库内逐条清单 / include additions and deletions; link an in-repo per-record list for bulk changes）
- 派生字段规则 / Derived-field rules: （简称、拼音、代码裁剪、占位层等 / short name, pinyin, code trimming, placeholders, etc.）
- 未覆盖范围、冲突及待核实事项 / Exclusions, conflicts and unresolved questions:
- 关联 PR / Related PR:
```

未核实事项只能作为待办记录，不能凭本模板中的声明进入规范数据。
名称变更的证据不自动证明代码变更；第三方镜像仅可作为线索附注。
Unverified items remain pending and cannot enter canonical data just because
this template is filled in. Evidence for a name change does not automatically
support a code change; third-party mirrors may only be noted as leads.
