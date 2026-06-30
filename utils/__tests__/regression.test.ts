import { describe, it, expect } from 'vitest'
import { BLANK_REGEX, getBlankCount, parseFillBlankContent } from '../fillBlank'
import {
  getStatusLabel,
  getStatusClass,
  getStatusIcon,
  getStatusColor,
} from '../examStatus'

describe('Bug Fix: Fill-blank regex compatibility', () => {
  // Regression tests for TASK-002 through TASK-005
  // The original bug: some files only matched Chinese brackets （）,
  // but not English brackets ()

  describe('REQ-002: Must be compatible with both bracket types', () => {
    it('detects Chinese brackets （）', () => {
      expect(getBlankCount('请填写（）')).toBe(1)
    })

    it('detects English brackets ()', () => {
      expect(getBlankCount('Please fill ()')).toBe(1)
    })

    it('detects mixed bracket types in same content', () => {
      expect(getBlankCount('（）和()')).toBe(2)
    })

    it('detects brackets with spaces inside', () => {
      expect(getBlankCount('（  ）')).toBe(1)
      expect(getBlankCount('(  )')).toBe(1)
    })

    it('parses content with Chinese brackets correctly', () => {
      const result = parseFillBlankContent('中国的首都是（）')
      expect(result).toEqual([
        { type: 'text', text: '中国的首都是' },
        { type: 'blank', blankIndex: 0 },
      ])
    })

    it('parses content with English brackets correctly', () => {
      const result = parseFillBlankContent('The capital of China is ()')
      expect(result).toEqual([
        { type: 'text', text: 'The capital of China is ' },
        { type: 'blank', blankIndex: 0 },
      ])
    })

    it('parses content with mixed brackets correctly', () => {
      const result = parseFillBlankContent('（）和()')
      expect(result).toEqual([
        { type: 'blank', blankIndex: 0 },
        { type: 'text', text: '和' },
        { type: 'blank', blankIndex: 1 },
      ])
    })
  })
})

describe('Bug Fix: Exam record status handling', () => {
  // Regression tests for TASK-006 through TASK-009
  // The original bug: status 6 (Retaken) was not handled

  describe('REQ-004: All statuses 0-6 must be handled', () => {
    const createRecord = (status: number, total_score: number | null = null, passing_score?: number) => ({
      id: 1,
      status,
      total_score,
      exam: passing_score !== undefined ? { passing_score } : undefined,
    })

    it('handles status 0 (InProgress)', () => {
      const r = createRecord(0)
      expect(getStatusLabel(r)).toBe('进行中')
      expect(getStatusClass(r)).toContain('gray')
      expect(getStatusIcon(r)).toContain('pencil')
      expect(getStatusColor(r)).toBe('gray')
    })

    it('handles status 1 (Submitted)', () => {
      const r = createRecord(1)
      expect(getStatusLabel(r)).toBe('已提交')
      expect(getStatusClass(r)).toContain('blue')
      expect(getStatusIcon(r)).toContain('paper-airplane')
      expect(getStatusColor(r)).toBe('blue')
    })

    it('handles status 2 (AutoGraded) without score', () => {
      const r = createRecord(2)
      expect(getStatusLabel(r)).toBe('已自动评分')
      expect(getStatusClass(r)).toContain('cyan')
    })

    it('handles status 2 (AutoGraded) with passing score', () => {
      const r = createRecord(2, 80, 60)
      expect(getStatusLabel(r)).toBe('通过')
      expect(getStatusClass(r)).toContain('green')
    })

    it('handles status 2 (AutoGraded) with failing score', () => {
      const r = createRecord(2, 50, 60)
      expect(getStatusLabel(r)).toBe('未通过')
      expect(getStatusClass(r)).toContain('red')
    })

    it('handles status 3 (PendingReview)', () => {
      const r = createRecord(3)
      expect(getStatusLabel(r)).toBe('待批改')
      expect(getStatusClass(r)).toContain('orange')
    })

    it('handles status 4 (Graded) without score', () => {
      const r = createRecord(4)
      expect(getStatusLabel(r)).toBe('已完成')
    })

    it('handles status 4 (Graded) with passing score', () => {
      const r = createRecord(4, 80, 60)
      expect(getStatusLabel(r)).toBe('通过')
    })

    it('handles status 4 (Graded) with failing score', () => {
      const r = createRecord(4, 50, 60)
      expect(getStatusLabel(r)).toBe('未通过')
    })

    it('handles status 5 (Rejected)', () => {
      const r = createRecord(5)
      expect(getStatusLabel(r)).toBe('已驳回')
      expect(getStatusClass(r)).toContain('red')
      expect(getStatusIcon(r)).toContain('exclamation')
    })

    it('handles status 6 (Retaken) - BUG FIX', () => {
      // This was the original bug: status 6 was not handled
      const r = createRecord(6)
      expect(getStatusLabel(r)).toBe('已重考')
      expect(getStatusClass(r)).toContain('gray')
      expect(getStatusIcon(r)).toContain('arrow-path')
      expect(getStatusColor(r)).toBe('gray')
    })

    it('handles unknown status gracefully', () => {
      const r = createRecord(99)
      expect(getStatusLabel(r)).toBe('99')
      expect(getStatusClass(r)).toContain('gray')
    })
  })
})
