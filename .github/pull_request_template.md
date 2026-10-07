## 变更说明 / Summary

<!-- 说明原因、范围和验证结果 / Describe why, scope and validation. -->

## 数据来源核对 / Data provenance review

<!-- 非数据 PR 可勾选首项，其余标为不适用。数据 PR 必须完成后续各项，缺少证据的变更不得合并。
For a non-data PR, check the first item and mark the rest N/A. Data PRs must
complete the remaining items; changes lacking evidence must not be merged. -->

- [ ] 本 PR 不修改规范 JSONL 或生成 SQL / No canonical JSONL or generated SQL changes.
- 来源清单记录链接 / Links to entries in `data/SOURCES.md`:
- 待核实且未纳入数据的事项 / Unresolved items excluded from the data changes:

- [ ] 按实际层级记录公开权威来源、发布机构、原始 URL、发布日期及覆盖范围。
      Public authoritative sources, publishers, original URLs, publication dates
      and coverage are recorded by actual administrative level.
- [ ] 已将每项新增、删除和修改对应到证据及变更前后值，并解释包内映射及派生字段。
      Each addition, deletion and modification maps to evidence and before/after
      values; package mappings and derived fields are explained.
- [ ] 乡级变更可由公开权威来源验证，未通过推断或第三方镜像替代；未核实部分已暂缓。
      Township changes are publicly and authoritatively verifiable, without
      inference or mirror substitution; unsupported portions are deferred.
- [ ] 已说明数据时点、未覆盖范围和冲突；局部更新没有被表述为全国全量刷新。
      Data dates, exclusions and conflicts are explicit; partial updates are
      not presented as a nationwide refresh.
- [ ] 已重生成 SQL，同步计数、文档、`DATA_VERSION` 与变更记录，并运行仓库要求的检查。
      SQL, counts, documentation, `DATA_VERSION` and changelog are consistent,
      and the repository's required checks have run.

维护者合并前须按 [NOTICE.md](../NOTICE.md) / [NOTICE_en.md](../NOTICE_en.md)
人工核对来源与实际 diff；CI 的计数和 SQL 测试不验证证据真实性。
Maintainers must manually compare sources with the actual diff before merging;
CI count and SQL tests do not validate evidence authenticity.
