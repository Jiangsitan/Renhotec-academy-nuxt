/**
 * 填空题解析工具
 * 从 exam/result/[id].vue 提取的纯逻辑函数
 */

export interface FillBlankPart {
  type: 'text' | 'blank' | 'image'
  text?: string
  html?: string
  blankIndex?: number
  src?: string
  studentAnswer?: string
  referenceAnswer?: string
  showReference?: boolean
}

/**
 * 标准化的填空检测正则
 * 同时支持中文括号（）和英文括号()
 */
export const BLANK_REGEX = /（\s*）|\(\s*\)/g

/**
 * 检测内容中的空白数量
 */
export const getBlankCount = (content: string): number => {
  if (!content) return 0
  const matches = content.match(BLANK_REGEX)
  return matches ? matches.length : 0
}

/**
 * 解析填空题内容为文本和空位部分
 */
export const parseFillBlankContent = (content: string): FillBlankPart[] => {
  if (!content) return []

  const parts: FillBlankPart[] = []
  const regex = new RegExp(BLANK_REGEX.source, 'g')
  let lastIndex = 0
  let blankIndex = 0
  let match

  while ((match = regex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', text: content.slice(lastIndex, match.index) })
    }
    parts.push({ type: 'blank', blankIndex })
    blankIndex++
    lastIndex = match.index + match[0].length
  }

  if (lastIndex < content.length) {
    parts.push({ type: 'text', text: content.slice(lastIndex) })
  }

  return parts
}

/**
 * 解析填空题参考答案为数组
 * 支持：JSON数组、JSON对象、逗号/顿号分隔字符串、纯字符串
 */
export const parseCorrectAnswers = (correctAnswer: string | null | undefined, questionType: number): string[] => {
  if (!correctAnswer) return []
  if (questionType === 5) {
    try {
      const parsed = JSON.parse(correctAnswer)
      if (Array.isArray(parsed)) return parsed.map(String)
      if (typeof parsed === 'object' && parsed !== null) return Object.values(parsed).map(String)
    } catch {
      // JSON解析失败，尝试分隔符拆分
    }
    // 逗号或顿号分隔
    if (correctAnswer.includes(',') || correctAnswer.includes('、')) {
      return correctAnswer.split(/[,、]/).map(s => s.trim()).filter(Boolean)
    }
  }
  return [correctAnswer]
}

/**
 * 格式化参考答案（用于显示）
 */
export const formatCorrectAnswer = (correctAnswer: string | null | undefined, questionType: number): string => {
  if (!correctAnswer) return ''

  if (questionType === 5) {
    try {
      const parsed = JSON.parse(correctAnswer)
      if (Array.isArray(parsed)) return parsed.join('、')
      if (typeof parsed === 'object' && parsed !== null) return Object.values(parsed).join('、')
    } catch {}
    if (correctAnswer.includes(',') || correctAnswer.includes('、')) {
      return correctAnswer.split(/[,、]/).map(s => s.trim()).filter(Boolean).join('、')
    }
  }

  return correctAnswer
}

/**
 * 获取作弊类型标签
 */
export const getCheatTypeLabel = (action: string): string => {
  const map: Record<string, string> = {
    leave_page: '离开考试页面',
    blur: '浏览器窗口失去焦点',
    exit_fullscreen: '退出全屏模式',
  }
  return map[action] || action
}
