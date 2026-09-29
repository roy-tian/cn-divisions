# Data provenance and normalization

[中文](NOTICE.md) | **English**

## Data and sources

`data/divisions.jsonl` holds 43,114 administrative divisions (行政区划) of
China in the GB/T 2260 code system: 34 province-level entries (23 provinces
including 台湾省, 5 autonomous regions, 4 municipalities, 2 SARs) and the
cities, counties and townships/streets under them, each with pinyin and the
full official name. The codes and names are official public data from:

- **民政部** (Ministry of Civil Affairs) — 行政区划代码, county level and above
- **国家统计局** (National Bureau of Statistics) — 统计用区划代码和城乡划分代码,
  township/street level

This repository's data was derived from a downstream project's seed dump whose
upstream publication date is undocumented, so it is dated as described below.

## Snapshot dating

The dump carries no version stamp. All of the following changes are present
in the data:

| Marker                                | Change date |
| ------------------------------------- | ----------- |
| 蓟州区 (not 蓟县)                     | 2016-07     |
| 莱芜区 (prefecture-level 莱芜市 gone) | 2019-01     |
| 龙港市                                | 2019-08     |
| 新星市                                | 2021-01     |
| 白杨市                                | 2023-04     |

The snapshot is therefore no older than April 2023, with no established upper
bound. `DATA_VERSION` is `snapshot-2023` for now; when the dataset is refreshed
from a dated upstream publication, set it to that date.

## Normalization applied to the source dump

1. **Dropped the "国外" pseudo tree** (`91`, `9100`, `910000`, `910000000`).
   It was a downstream application's filter convention, not an administrative
   division.
2. **Kept Taiwan `71`, Hong Kong `81` and Macau `82`** with their standard
   codes, replacing the sort markers in their `pinyinPrefix` (`~1`, `~2`,
   `~3`) with the real pinyin initials (`t`, `x`, `a`).

These rules live in `scripts/import-seed.ts` and are applied automatically on
re-import (`npm run import:seed -- --source=<file>`).

## Code and hierarchy conventions

- **Code lengths**: province 2 digits (`11`), city 4 (`1101`), county 6
  (`110101`), township 9 (`110101001`). Exceptions: province-direct
  county-level cities keep their 6-digit official code at level 1, and their
  placeholder takes a 9-digit `…000` code (济源市 `419001` → 济源市
  `419001000` → 沁园街道 `419001001`); HK/MO districts hang off a 6-digit
  layer with 9-digit codes (`810000` → `810101000`). A child code is
  therefore not always prefixed by its parent's — follow `parentCode` instead
  of truncating codes.
- **Official codes**: every lookup accepts official 6-digit (GB/T 2260) and
  12-digit (NBS) codes, exact match first; `normalizeCode()` returns the
  mapped package code. Trims follow official suffixes only — province
  `…0000`, city `…00`, township `…000` (12 → 9 digits), county `…000000`.
  Unrecognized codes such as `130299` or `110101999000` return not-found
  instead of collapsing onto an ancestor; village-level 12-digit codes are
  out of scope.
- **12-digit county codes** always resolve to the county, even when a
  level-3 record under it is numbered `000` (`150524000000` → 库伦旗
  `150524`, not 库伦街道 `150524000`; `710101000000` → 中正区 `710101`).
  Only a level-2 placeholder keeps the 9-digit hit (`419001000000` →
  `419001000`).
- **Same-named placeholder layers**: district-less prefecture cities (东莞,
  中山, 儋州) and province-direct county-level cities (济源, 仙桃, 潜江, 天门,
  XPCC cities, Hainan directs, …) have a same-named level-2 placeholder
  between city and township (东莞市 `4419` → 东莞市 `441900` → streets), and
  their official 12-digit codes resolve to it (`441900000000` → `441900`).
  The county-level cities are typed as level 1.
- **Taiwan, Hong Kong, Macau**: Taiwan has 20 cities/counties and 358
  districts/townships (level 2), each with a same-named level-3 mirror
  (中正区 `710101` → `710101000`); there is no real township data. HK/MO go
  SAR → two same-named layers (`8100`, `810000`) → districts (Macau: 堂区);
  since exact matches win, the official codes `810000` / `820000` resolve to
  the level-2 layer, not to `81` / `82`. Data for all three is older than the
  mainland snapshot — treat it as indicative.

## License

- **Code**: MIT, see [LICENSE](LICENSE).
- **Data**: administrative-division codes and names are factual public
  information published by government authorities; this compilation is
  distributed under MIT as well. No warranty is given as to fitness for any
  particular use — verify against official publications for legal purposes.
