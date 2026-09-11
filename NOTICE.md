# Data provenance and normalization — 数据出处与规范化说明

## What this data is

`data/divisions.jsonl` holds China's administrative divisions (行政区划) in the
GB/T 2260 code system: 34 province-level entries (23 省, 5 自治区, 4 直辖市,
台湾, 香港, 澳门), then cities, counties, and township/street entries —
43,114 rows in total, each with pinyin (spaced syllables and initial letter)
and a full official name.

## Sources

Administrative-division codes and names are official public data published by:

- 民政部 (Ministry of Civil Affairs) — 行政区划代码, county level and above
- 国家统计局 (National Bureau of Statistics) — 统计用区划代码和城乡划分代码,
  township/street level

The dataset in this repository was derived from a downstream project's seed
dump. The exact upstream publication date of that dump is undocumented; see
"Snapshot dating" below.

## Snapshot dating

The dump carries no version stamp, so it is dated by change markers inside the
data:

| Marker                  | Change date | Present in data | Implies   |
| ----------------------- | ----------- | --------------- | --------- |
| 蓟州区 (not 蓟县)       | 2016-07     | yes             | ≥ 2016-07 |
| 莱芜区 (地级莱芜市已撤) | 2019-01     | yes             | ≥ 2019-01 |
| 龙港市                  | 2019-08     | yes             | ≥ 2019-08 |
| 新星市                  | 2021-01     | yes             | ≥ 2021-01 |
| 白杨市                  | 2023-04     | yes             | ≥ 2023-04 |

`DATA_VERSION` is therefore exported as `snapshot-2023`: the snapshot is at
least as new as April 2023. No upper bound is established. When the dataset is
refreshed from a dated upstream publication, update `DATA_VERSION` to that
date.

## Normalization applied to the source dump

1. **Dropped the "国外" pseudo tree** (`91`, `9100`, `910000`, `910000000`).
   It was a downstream application's filter convention, not an administrative
   division.
2. **Kept 台湾 `71` / 香港 `81` / 澳门 `82`** with their standard codes. Their
   `pinyinPrefix` carried sort markers (`~1`, `~2`, `~3`) in the source; these
   are normalized to the real pinyin initials (`t`, `x`, `a`).

## Regenerating artifacts

- `sql/postgresql/divisions.sql` is generated from the JSONL
  (`npm run generate:sql`). Never edit it by hand.
- Re-importing from an upstream SQL dump is done with
  `npm run import:seed -- --source=<file>`; the normalization rules above are
  applied automatically.

## License

Code: MIT (see [LICENSE](LICENSE)).
Data: administrative-division codes and names are factual public information
published by government authorities; this compilation is distributed under MIT
as well. No warranty is given as to fitness for any particular use — verify
against official publications for legal purposes.
