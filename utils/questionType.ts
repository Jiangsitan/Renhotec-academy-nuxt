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
