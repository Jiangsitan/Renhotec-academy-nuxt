import { describe, it, expect } from 'vitest'
import {
  getStatusLabel,
  getStatusClass,
  getStatusIcon,
  getStatusColor,
  getScoreClass,
  ExamRecordStatus,
} from '../examStatus'

describe('examStatus', () => {
  // Helper to create test records
  const createRecord = (overrides: Partial<ExamRecordStatus> = {}): ExamRecordStatus => ({
    id: 1,
    status: 0,
    total_score: null,
    exam: undefined,
    ...overrides,
  })

  // ========== Interface Type Safety ==========
  describe('ExamRecordStatus interface', () => {
    it('must include status property (type-safe contract)', () => {
      // This test documents the TYPE CONTRACT:
      // ExamRecordStatus MUST have a `status` field.
      // If this test compiles, the interface is correct.
      const record: ExamRecordStatus = {
        id: 1,
        status: 0,
        total_score: null,
      }
      expect(record.status).toBe(0)
    })

    it('must allow all valid status values 0-6', () => {
      for (let s = 0; s <= 6; s++) {
        const record: ExamRecordStatus = {
          id: 1,
          status: s,
          total_score: null,
        }
        expect(record.status).toBe(s)
      }
    })

    it('must allow optional exam with passing_score', () => {
      const record: ExamRecordStatus = {
        id: 1,
        status: 4,
        total_score: 80,
        exam: { passing_score: 60 },
      }
      expect(record.exam?.passing_score).toBe(60)
    })

    it('must allow null total_score', () => {
      const record: ExamRecordStatus = {
        id: 1,
        status: 3,
        total_score: null,
      }
      expect(record.total_score).toBeNull()
    })
  })

  // ========== getStatusLabel ==========
  describe('getStatusLabel', () => {
    it('returns 进行中 for status 0', () => {
      expect(getStatusLabel(createRecord({ status: 0 }))).toBe('进行中')
    })

    it('returns 已提交 for status 1', () => {
      expect(getStatusLabel(createRecord({ status: 1 }))).toBe('已提交')
    })

    it('returns 已自动评分 for status 2 without score', () => {
      expect(getStatusLabel(createRecord({ status: 2 }))).toBe('已自动评分')
    })

    it('returns 通过 for status 2 when score >= passing', () => {
      expect(getStatusLabel(createRecord({
        status: 2,
        total_score: 80,
        exam: { passing_score: 60 },
      }))).toBe('通过')
    })

    it('returns 未通过 for status 2 when score < passing', () => {
      expect(getStatusLabel(createRecord({
        status: 2,
        total_score: 50,
        exam: { passing_score: 60 },
      }))).toBe('未通过')
    })

    it('returns 待批改 for status 3', () => {
      expect(getStatusLabel(createRecord({ status: 3 }))).toBe('待批改')
    })

    it('returns 已完成 for status 4 without score', () => {
      expect(getStatusLabel(createRecord({ status: 4 }))).toBe('已完成')
    })

    it('returns 通过 for status 4 when score >= passing', () => {
      expect(getStatusLabel(createRecord({
        status: 4,
        total_score: 90,
        exam: { passing_score: 60 },
      }))).toBe('通过')
    })

    it('returns 未通过 for status 4 when score < passing', () => {
      expect(getStatusLabel(createRecord({
        status: 4,
        total_score: 40,
        exam: { passing_score: 60 },
      }))).toBe('未通过')
    })

    it('returns 已驳回 for status 5', () => {
      expect(getStatusLabel(createRecord({ status: 5 }))).toBe('已驳回')
    })

    it('returns 已重考 for status 6', () => {
      expect(getStatusLabel(createRecord({ status: 6 }))).toBe('已重考')
    })

    it('returns raw status for unknown status', () => {
      expect(getStatusLabel(createRecord({ status: 99 }))).toBe('99')
    })

    // Edge cases
    it('handles status 2 with passing_score=0', () => {
      expect(getStatusLabel(createRecord({
        status: 2,
        total_score: 0,
        exam: { passing_score: 0 },
      }))).toBe('通过')
    })

    it('handles status 4 with total_score=0 and passing_score=1', () => {
      expect(getStatusLabel(createRecord({
        status: 4,
        total_score: 0,
        exam: { passing_score: 1 },
      }))).toBe('未通过')
    })

    it('returns 已自动评分 for status 2 when exam has no passing_score', () => {
      expect(getStatusLabel(createRecord({
        status: 2,
        total_score: 80,
        exam: {},
      }))).toBe('已自动评分')
    })

    it('returns 已完成 for status 4 when exam has no passing_score', () => {
      expect(getStatusLabel(createRecord({
        status: 4,
        total_score: 80,
        exam: {},
      }))).toBe('已完成')
    })
  })

  // ========== getStatusClass ==========
  describe('getStatusClass', () => {
    it('returns gray class for status 0', () => {
      expect(getStatusClass(createRecord({ status: 0 }))).toBe('bg-gray-100 text-gray-600')
    })

    it('returns blue class for status 1', () => {
      expect(getStatusClass(createRecord({ status: 1 }))).toBe('bg-blue-100 text-blue-600')
    })

    it('returns cyan class for status 2 without score', () => {
      expect(getStatusClass(createRecord({ status: 2 }))).toBe('bg-cyan-100 text-cyan-600')
    })

    it('returns green class for status 2 when passed', () => {
      expect(getStatusClass(createRecord({
        status: 2,
        total_score: 80,
        exam: { passing_score: 60 },
      }))).toBe('bg-green-100 text-green-600')
    })

    it('returns red class for status 2 when failed', () => {
      expect(getStatusClass(createRecord({
        status: 2,
        total_score: 50,
        exam: { passing_score: 60 },
      }))).toBe('bg-red-100 text-red-600')
    })

    it('returns orange class for status 3', () => {
      expect(getStatusClass(createRecord({ status: 3 }))).toBe('bg-orange-100 text-orange-600')
    })

    it('returns gray class for status 4 without score', () => {
      expect(getStatusClass(createRecord({ status: 4 }))).toBe('bg-gray-100 text-gray-500')
    })

    it('returns green class for status 4 when passed', () => {
      expect(getStatusClass(createRecord({
        status: 4,
        total_score: 80,
        exam: { passing_score: 60 },
      }))).toBe('bg-green-100 text-green-600')
    })

    it('returns red class for status 4 when failed', () => {
      expect(getStatusClass(createRecord({
        status: 4,
        total_score: 50,
        exam: { passing_score: 60 },
      }))).toBe('bg-red-100 text-red-600')
    })

    it('returns red class for status 5', () => {
      expect(getStatusClass(createRecord({ status: 5 }))).toBe('bg-red-100 text-red-600')
    })

    it('returns gray class for status 6', () => {
      expect(getStatusClass(createRecord({ status: 6 }))).toBe('bg-gray-100 text-gray-500')
    })

    it('returns default gray class for unknown status', () => {
      expect(getStatusClass(createRecord({ status: 99 }))).toBe('bg-gray-100 text-gray-500')
    })
  })

  // ========== getStatusIcon ==========
  describe('getStatusIcon', () => {
    it('returns pencil icon for status 0', () => {
      expect(getStatusIcon(createRecord({ status: 0 }))).toBe('i-heroicons-pencil-square')
    })

    it('returns paper airplane icon for status 1', () => {
      expect(getStatusIcon(createRecord({ status: 1 }))).toBe('i-heroicons-paper-airplane')
    })

    it('returns calculator icon for status 2 without score', () => {
      expect(getStatusIcon(createRecord({ status: 2 }))).toBe('i-heroicons-calculator')
    })

    it('returns check circle for status 2 when passed', () => {
      expect(getStatusIcon(createRecord({
        status: 2,
        total_score: 80,
        exam: { passing_score: 60 },
      }))).toBe('i-heroicons-check-circle')
    })

    it('returns x circle for status 2 when failed', () => {
      expect(getStatusIcon(createRecord({
        status: 2,
        total_score: 50,
        exam: { passing_score: 60 },
      }))).toBe('i-heroicons-x-circle')
    })

    it('returns clock icon for status 3', () => {
      expect(getStatusIcon(createRecord({ status: 3 }))).toBe('i-heroicons-clock')
    })

    it('returns clipboard check icon for status 4 without score', () => {
      expect(getStatusIcon(createRecord({ status: 4 }))).toBe('i-heroicons-clipboard-document-check')
    })

    it('returns check circle for status 4 when passed', () => {
      expect(getStatusIcon(createRecord({
        status: 4,
        total_score: 80,
        exam: { passing_score: 60 },
      }))).toBe('i-heroicons-check-circle')
    })

    it('returns x circle for status 4 when failed', () => {
      expect(getStatusIcon(createRecord({
        status: 4,
        total_score: 50,
        exam: { passing_score: 60 },
      }))).toBe('i-heroicons-x-circle')
    })

    it('returns warning icon for status 5', () => {
      expect(getStatusIcon(createRecord({ status: 5 }))).toBe('i-heroicons-exclamation-triangle')
    })

    it('returns arrow path icon for status 6', () => {
      expect(getStatusIcon(createRecord({ status: 6 }))).toBe('i-heroicons-arrow-path')
    })

    it('returns default clipboard icon for unknown status', () => {
      expect(getStatusIcon(createRecord({ status: 99 }))).toBe('i-heroicons-clipboard-document-check')
    })
  })

  // ========== getStatusColor ==========
  describe('getStatusColor', () => {
    it('returns gray for status 0', () => {
      expect(getStatusColor(createRecord({ status: 0 }))).toBe('gray')
    })

    it('returns blue for status 1', () => {
      expect(getStatusColor(createRecord({ status: 1 }))).toBe('blue')
    })

    it('returns cyan for status 2 without score', () => {
      expect(getStatusColor(createRecord({ status: 2 }))).toBe('cyan')
    })

    it('returns green for status 2 when passed', () => {
      expect(getStatusColor(createRecord({
        status: 2,
        total_score: 80,
        exam: { passing_score: 60 },
      }))).toBe('green')
    })

    it('returns red for status 2 when failed', () => {
      expect(getStatusColor(createRecord({
        status: 2,
        total_score: 50,
        exam: { passing_score: 60 },
      }))).toBe('red')
    })

    it('returns orange for status 3', () => {
      expect(getStatusColor(createRecord({ status: 3 }))).toBe('orange')
    })

    it('returns gray for status 4 without score', () => {
      expect(getStatusColor(createRecord({ status: 4 }))).toBe('gray')
    })

    it('returns green for status 4 when passed', () => {
      expect(getStatusColor(createRecord({
        status: 4,
        total_score: 80,
        exam: { passing_score: 60 },
      }))).toBe('green')
    })

    it('returns red for status 4 when failed', () => {
      expect(getStatusColor(createRecord({
        status: 4,
        total_score: 50,
        exam: { passing_score: 60 },
      }))).toBe('red')
    })

    it('returns red for status 5', () => {
      expect(getStatusColor(createRecord({ status: 5 }))).toBe('red')
    })

    it('returns gray for status 6', () => {
      expect(getStatusColor(createRecord({ status: 6 }))).toBe('gray')
    })

    it('returns default gray for unknown status', () => {
      expect(getStatusColor(createRecord({ status: 99 }))).toBe('gray')
    })
  })

  // ========== getScoreClass ==========
  describe('getScoreClass', () => {
    it('returns gray for status 0', () => {
      expect(getScoreClass(createRecord({ status: 0 }))).toBe('text-gray-400')
    })

    it('returns gray for status 1', () => {
      expect(getScoreClass(createRecord({ status: 1 }))).toBe('text-gray-400')
    })

    it('returns cyan for status 2 without score', () => {
      expect(getScoreClass(createRecord({ status: 2 }))).toBe('text-cyan-500')
    })

    it('returns green for status 2 when passed', () => {
      expect(getScoreClass(createRecord({
        status: 2,
        total_score: 80,
        exam: { passing_score: 60 },
      }))).toBe('text-green-600')
    })

    it('returns red for status 2 when failed', () => {
      expect(getScoreClass(createRecord({
        status: 2,
        total_score: 50,
        exam: { passing_score: 60 },
      }))).toBe('text-red-500')
    })

    it('returns orange for status 3', () => {
      expect(getScoreClass(createRecord({ status: 3 }))).toBe('text-orange-500')
    })

    it('returns gray for status 4 without score', () => {
      expect(getScoreClass(createRecord({ status: 4 }))).toBe('text-gray-400')
    })

    it('returns green for status 4 when passed', () => {
      expect(getScoreClass(createRecord({
        status: 4,
        total_score: 80,
        exam: { passing_score: 60 },
      }))).toBe('text-green-600')
    })

    it('returns red for status 4 when failed', () => {
      expect(getScoreClass(createRecord({
        status: 4,
        total_score: 50,
        exam: { passing_score: 60 },
      }))).toBe('text-red-500')
    })

    it('returns red for status 5', () => {
      expect(getScoreClass(createRecord({ status: 5 }))).toBe('text-red-500')
    })

    it('returns gray for status 6', () => {
      expect(getScoreClass(createRecord({ status: 6 }))).toBe('text-gray-400')
    })

    it('returns default gray for unknown status', () => {
      expect(getScoreClass(createRecord({ status: 99 }))).toBe('text-gray-400')
    })
  })
})
