import { describe, it, expect } from 'vitest'
import {
  QUESTION_TYPE,
  QUESTION_TYPE_LABELS,
  QUESTION_TYPE_SHORT_LABELS,
  ENUM_TO_INT,
  normalizeQuestionType,
  getTypeLabel,
  getTypeShortLabel,
  isChoiceType,
  CHOICE_TYPES,
} from '../questionType'

describe('questionType', () => {
  // ========== Constants ==========
  describe('QUESTION_TYPE constants', () => {
    it('defines correct type values', () => {
      expect(QUESTION_TYPE.SINGLE).toBe(1)
      expect(QUESTION_TYPE.MULTIPLE).toBe(2)
      expect(QUESTION_TYPE.TRUEFALSE).toBe(3)
      expect(QUESTION_TYPE.SHORT_ANSWER).toBe(4)
      expect(QUESTION_TYPE.FILL_BLANK).toBe(5)
    })
  })

  describe('CHOICE_TYPES', () => {
    it('includes single, multiple, and true/false', () => {
      expect(CHOICE_TYPES).toContain(1)
      expect(CHOICE_TYPES).toContain(2)
      expect(CHOICE_TYPES).toContain(3)
    })

    it('does not include short answer or fill blank', () => {
      expect(CHOICE_TYPES).not.toContain(4)
      expect(CHOICE_TYPES).not.toContain(5)
    })
  })

  // ========== getTypeLabel ==========
  describe('getTypeLabel', () => {
    it('returns correct labels for all types', () => {
      expect(getTypeLabel(1)).toBe('单选题')
      expect(getTypeLabel(2)).toBe('多选题')
      expect(getTypeLabel(3)).toBe('判断题')
      expect(getTypeLabel(4)).toBe('简答题')
      expect(getTypeLabel(5)).toBe('填空题')
    })

    it('returns 未知 for unknown type', () => {
      expect(getTypeLabel(99)).toBe('未知')
      expect(getTypeLabel(0)).toBe('未知')
    })
  })

  // ========== getTypeShortLabel ==========
  describe('getTypeShortLabel', () => {
    it('returns correct short labels for all types', () => {
      expect(getTypeShortLabel(1)).toBe('单选')
      expect(getTypeShortLabel(2)).toBe('多选')
      expect(getTypeShortLabel(3)).toBe('判断')
      expect(getTypeShortLabel(4)).toBe('简答')
      expect(getTypeShortLabel(5)).toBe('填空')
    })

    it('returns 未知 for unknown type', () => {
      expect(getTypeShortLabel(99)).toBe('未知')
    })
  })

  // ========== isChoiceType ==========
  describe('isChoiceType', () => {
    it('returns true for choice types', () => {
      expect(isChoiceType(1)).toBe(true)
      expect(isChoiceType(2)).toBe(true)
      expect(isChoiceType(3)).toBe(true)
    })

    it('returns false for non-choice types', () => {
      expect(isChoiceType(4)).toBe(false)
      expect(isChoiceType(5)).toBe(false)
    })

    it('returns false for unknown types', () => {
      expect(isChoiceType(99)).toBe(false)
    })
  })

  // ========== ENUM_TO_INT ==========
  describe('ENUM_TO_INT', () => {
    it('maps all MySQL ENUM strings to integers', () => {
      expect(ENUM_TO_INT.single).toBe(1)
      expect(ENUM_TO_INT.multiple).toBe(2)
      expect(ENUM_TO_INT.truefalse).toBe(3)
      expect(ENUM_TO_INT.short_answer).toBe(4)
      expect(ENUM_TO_INT.fill_blank).toBe(5)
    })

    it('has exactly 5 entries', () => {
      expect(Object.keys(ENUM_TO_INT)).toHaveLength(5)
    })
  })

  // ========== normalizeQuestionType ==========
  describe('normalizeQuestionType', () => {
    it('passes through integers unchanged', () => {
      expect(normalizeQuestionType(1)).toBe(1)
      expect(normalizeQuestionType(2)).toBe(2)
      expect(normalizeQuestionType(3)).toBe(3)
      expect(normalizeQuestionType(4)).toBe(4)
      expect(normalizeQuestionType(5)).toBe(5)
    })

    it('converts MySQL ENUM strings to integers', () => {
      expect(normalizeQuestionType('single')).toBe(1)
      expect(normalizeQuestionType('multiple')).toBe(2)
      expect(normalizeQuestionType('truefalse')).toBe(3)
      expect(normalizeQuestionType('short_answer')).toBe(4)
      expect(normalizeQuestionType('fill_blank')).toBe(5)
    })

    it('returns 0 for unknown string types', () => {
      expect(normalizeQuestionType('unknown')).toBe(0)
      expect(normalizeQuestionType('')).toBe(0)
    })

    it('handles edge case: integer 0', () => {
      expect(normalizeQuestionType(0)).toBe(0)
    })

    // Regression: This is the critical bug the fix addresses
    it('REGRESSION: fill_blank string must equal integer 5 after normalization', () => {
      const dbType = 'fill_blank' // what MySQL ENUM returns
      expect(normalizeQuestionType(dbType)).toBe(QUESTION_TYPE.FILL_BLANK)
    })

    it('REGRESSION: all ENUM strings map to correct QUESTION_TYPE constants', () => {
      expect(normalizeQuestionType('single')).toBe(QUESTION_TYPE.SINGLE)
      expect(normalizeQuestionType('multiple')).toBe(QUESTION_TYPE.MULTIPLE)
      expect(normalizeQuestionType('truefalse')).toBe(QUESTION_TYPE.TRUEFALSE)
      expect(normalizeQuestionType('short_answer')).toBe(QUESTION_TYPE.SHORT_ANSWER)
      expect(normalizeQuestionType('fill_blank')).toBe(QUESTION_TYPE.FILL_BLANK)
    })
  })
})
