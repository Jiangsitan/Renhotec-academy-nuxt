import { describe, it, expect } from 'vitest'
import {
  BLANK_REGEX,
  getBlankCount,
  parseFillBlankContent,
  parseCorrectAnswers,
  formatCorrectAnswer,
  getCheatTypeLabel,
  FillBlankPart,
} from '../fillBlank'

describe('fillBlank', () => {
  // ========== BLANK_REGEX ==========
  describe('BLANK_REGEX', () => {
    it('matches Chinese brackets （）', () => {
      const matches = '中国（）的首都是北京'.match(BLANK_REGEX)
      expect(matches).toHaveLength(1)
    })

    it('matches English brackets ()', () => {
      const matches = 'The capital of China () is Beijing'.match(BLANK_REGEX)
      expect(matches).toHaveLength(1)
    })

    it('matches brackets with spaces', () => {
      const matches = '中国（  ）的首都是北京'.match(BLANK_REGEX)
      expect(matches).toHaveLength(1)
    })

    it('matches multiple brackets', () => {
      const matches = '（）和（）'.match(BLANK_REGEX)
      expect(matches).toHaveLength(2)
    })

    it('matches mixed bracket types', () => {
      const matches = '（）和()'.match(BLANK_REGEX)
      expect(matches).toHaveLength(2)
    })

    it('returns null for no brackets', () => {
      const matches = '没有空位'.match(BLANK_REGEX)
      expect(matches).toBeNull()
    })
  })

  // ========== getBlankCount ==========
  describe('getBlankCount', () => {
    it('returns 0 for empty string', () => {
      expect(getBlankCount('')).toBe(0)
    })

    it('returns 0 for null/undefined content', () => {
      expect(getBlankCount(null as any)).toBe(0)
      expect(getBlankCount(undefined as any)).toBe(0)
    })

    it('counts Chinese brackets', () => {
      expect(getBlankCount('中国（）的首都是北京')).toBe(1)
    })

    it('counts English brackets', () => {
      expect(getBlankCount('The capital of China () is Beijing')).toBe(1)
    })

    it('counts multiple blanks', () => {
      expect(getBlankCount('（）和（）')).toBe(2)
    })

    it('counts mixed bracket types', () => {
      expect(getBlankCount('（）和()')).toBe(2)
    })

    it('returns 0 for text without brackets', () => {
      expect(getBlankCount('没有空位')).toBe(0)
    })
  })

  // ========== parseFillBlankContent ==========
  describe('parseFillBlankContent', () => {
    it('returns empty array for empty string', () => {
      expect(parseFillBlankContent('')).toEqual([])
    })

    it('returns empty array for null/undefined', () => {
      expect(parseFillBlankContent(null as any)).toEqual([])
      expect(parseFillBlankContent(undefined as any)).toEqual([])
    })

    it('parses single blank with Chinese brackets', () => {
      const result = parseFillBlankContent('中国（）的首都是北京')
      expect(result).toEqual([
        { type: 'text', text: '中国' },
        { type: 'blank', blankIndex: 0 },
        { type: 'text', text: '的首都是北京' },
      ])
    })

    it('parses single blank with English brackets', () => {
      const result = parseFillBlankContent('The capital of China () is Beijing')
      expect(result).toEqual([
        { type: 'text', text: 'The capital of China ' },
        { type: 'blank', blankIndex: 0 },
        { type: 'text', text: ' is Beijing' },
      ])
    })

    it('parses multiple blanks', () => {
      const result = parseFillBlankContent('（）和（）')
      expect(result).toEqual([
        { type: 'blank', blankIndex: 0 },
        { type: 'text', text: '和' },
        { type: 'blank', blankIndex: 1 },
      ])
    })

    it('parses mixed bracket types', () => {
      const result = parseFillBlankContent('（）和()')
      expect(result).toEqual([
        { type: 'blank', blankIndex: 0 },
        { type: 'text', text: '和' },
        { type: 'blank', blankIndex: 1 },
      ])
    })

    it('parses content starting with blank', () => {
      const result = parseFillBlankContent('（）是首都')
      expect(result).toEqual([
        { type: 'blank', blankIndex: 0 },
        { type: 'text', text: '是首都' },
      ])
    })

    it('parses content ending with blank', () => {
      const result = parseFillBlankContent('首都是（）')
      expect(result).toEqual([
        { type: 'text', text: '首都是' },
        { type: 'blank', blankIndex: 0 },
      ])
    })

    it('parses content with only blank', () => {
      const result = parseFillBlankContent('（）')
      expect(result).toEqual([
        { type: 'blank', blankIndex: 0 },
      ])
    })
  })

  // ========== parseCorrectAnswers ==========
  describe('parseCorrectAnswers', () => {
    it('returns empty array for null/undefined', () => {
      expect(parseCorrectAnswers(null, 5)).toEqual([])
      expect(parseCorrectAnswers(undefined, 5)).toEqual([])
    })

    it('parses JSON array for fill_blank type', () => {
      expect(parseCorrectAnswers('["北京","上海"]', 5)).toEqual(['北京', '上海'])
    })

    it('parses JSON array with single element', () => {
      expect(parseCorrectAnswers('["北京"]', 5)).toEqual(['北京'])
    })

    it('returns original string for non-fill_blank type', () => {
      expect(parseCorrectAnswers('A', 1)).toEqual(['A'])
    })

    it('returns original string when JSON parse fails', () => {
      expect(parseCorrectAnswers('not json', 5)).toEqual(['not json'])
    })

    it('handles empty JSON array', () => {
      expect(parseCorrectAnswers('[]', 5)).toEqual([])
    })
  })

  // ========== formatCorrectAnswer ==========
  describe('formatCorrectAnswer', () => {
    it('returns empty string for null/undefined', () => {
      expect(formatCorrectAnswer(null, 5)).toBe('')
      expect(formatCorrectAnswer(undefined, 5)).toBe('')
    })

    it('joins JSON array with 、 for fill_blank type', () => {
      expect(formatCorrectAnswer('["北京","上海"]', 5)).toBe('北京、上海')
    })

    it('returns original string for non-fill_blank type', () => {
      expect(formatCorrectAnswer('A', 1)).toBe('A')
    })

    it('returns original string when JSON parse fails', () => {
      expect(formatCorrectAnswer('not json', 5)).toBe('not json')
    })
  })

  // ========== getCheatTypeLabel ==========
  describe('getCheatTypeLabel', () => {
    it('returns label for leave_page', () => {
      expect(getCheatTypeLabel('leave_page')).toBe('离开考试页面')
    })

    it('returns label for blur', () => {
      expect(getCheatTypeLabel('blur')).toBe('浏览器窗口失去焦点')
    })

    it('returns label for exit_fullscreen', () => {
      expect(getCheatTypeLabel('exit_fullscreen')).toBe('退出全屏模式')
    })

    it('returns original action for unknown type', () => {
      expect(getCheatTypeLabel('unknown_action')).toBe('unknown_action')
    })
  })
})
