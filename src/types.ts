/** 行政区划层级:0-省/直辖市/自治区(含台湾、香港、澳门),1-市,2-区/县,3-乡镇/街道。 */
export type DivisionLevel = 0 | 1 | 2 | 3;

/**
 * 一条行政区划记录,字段与 data/divisions.jsonl 逐行对应。
 * 运行时对象已冻结(Object.freeze),对缓存记录赋值会抛 TypeError。
 */
export interface Division {
  /** 行政区划代码(GB/T 2260 体系),如 "110101"。 */
  code: string;
  /** 父级代码,省级为 "0"。 */
  parentCode: string;
  level: DivisionLevel;
  /** 简称,如 "东城"。 */
  name: string;
  /** 拼音首字母(小写)。 */
  pinyinPrefix: string;
  /** 空格分隔的全拼音节,如 "dong cheng"。 */
  pinyin: string;
  /** 全称,如 "东城区"。 */
  fullName: string;
}

/** 子树节点:行政区划记录加上递归的 children;节点与其 children 数组同样已冻结。 */
export interface DivisionNode extends Division {
  children: DivisionNode[];
}

export interface SearchOptions {
  /** 简称或全称的子串匹配。 */
  name?: string;
  /** 全拼子串匹配(忽略大小写与空格),如 "dongguan"、"dong guan"。 */
  pinyin?: string;
  /** 拼音首字母精确匹配(不区分大小写),如 "b"。 */
  pinyinPrefix?: string;
  /** 层级精确匹配。 */
  level?: DivisionLevel;
}

export const LEVEL_NAMES: Record<DivisionLevel, string> = {
  0: "省/直辖市/自治区",
  1: "市",
  2: "区/县",
  3: "乡镇/街道",
};

/** 数据快照标识,详见 NOTICE.md 的断代说明。 */
export const DATA_VERSION = "snapshot-2023";
