// 题目类型常量
export const QUESTION_TYPE = {
  SINGLE: 1,
  MULTIPLE: 2,
  TRUEFALSE: 3,
  SHORT_ANSWER: 4,
  FILL_BLANK: 5,
} as const

// 题型标签映射（完整名称）
export const QUESTION_TYPE_LABELS: Record<number, string> = {
  1: '单选题',
  2: '多选题',
  3: '判断题',
  4: '简答题',
  5: '填空题',
}

// 题型标签映射（简短名称）
export const QUESTION_TYPE_SHORT_LABELS: Record<number, string> = {
  1: '单选',
  2: '多选',
  3: '判断',
  4: '简答',
  5: '填空',
}

/**
 * MySQL ENUM 字符串 → 前端整数映射
 * 数据库存储 ENUM('single','multiple','truefalse','short_answer','fill_blank')
 * 但前端统一使用整数 1-5
 */
export const ENUM_TO_INT: Record<string, number> = {
  single: 1,
  multiple: 2,
  truefalse: 3,
  short_answer: 4,
  fill_blank: 5,
}

/**
 * 将数据库返回的题型统一转为整数
 * 兼容整数（旧数据/SQLite）和 ENUM 字符串（MySQL）
 */
export const normalizeQuestionType = (type: string | number): number => {
  if (typeof type === 'number') return type
  return ENUM_TO_INT[type] ?? 0
}

// 获取题型标签（完整）
export const getTypeLabel = (type: number): string => {
  return QUESTION_TYPE_LABELS[type] || '未知'
}

// 获取题型标签（简短）
export const getTypeShortLabel = (type: number): string => {
  return QUESTION_TYPE_SHORT_LABELS[type] || '未知'
}

// 选择题类型（需要显示选项的题型）
export const CHOICE_TYPES = [1, 2, 3]

// 判断是否为选择题
export const isChoiceType = (type: number): boolean => {
  return CHOICE_TYPES.includes(type)
}
