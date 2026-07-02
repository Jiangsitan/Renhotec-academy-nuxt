import { describe, it, expect, beforeEach } from 'vitest'
import { useExamReview } from '../useExamReview'
import type { ExamRecord } from '../useExamReview'

/**
 * Integration tests verifying that useExamReview replaces all
 * inline logic previously duplicated in admin/pending-reviews.vue
 * and mentor/pending.vue.
 */
describe('useExamReview - Integration: replaces duplicated page logic', () => {
  let composable: ReturnType<typeof useExamReview>

  const mockRecord: ExamRecord = {
    id: 200,
    user: { name: '李四', employee_no: 'EMP002', department: '产品部' },
    exam: {
      id: 2,
      title: '产品知识考试',
      passing_score: 60,
      questions: [
        { id: 1, type: 1, content: '什么是产品?', options: ['A. 工具', 'B. 服务', 'C. 体验', 'D. 以上都是'], correct_answer: 'D', score: 10 },
        { id: 2, type: 2, content: '产品三要素?', options: ['A. 用户', 'B. 商业', 'C. 技术', 'D. 设计'], correct_answer: 'A,B,C', score: 15 },
        { id: 3, type: 3, content: '产品就是功能', correct_answer: 'false', score: 5 },
        { id: 4, type: 4, content: '描述产品生命周期', correct_answer: '引入、成长、成熟、衰退', score: 20 },
        { id: 5, type: 5, content: '产品三要素是（）（）和（）', correct_answer: '["用户","商业","技术"]', score: 10 },
      ],
    },
    answers: [
      { question_id: 1, question_type: 1, answer: 'D', is_correct: true, score_awarded: 10, auto_graded: true },
      { question_id: 2, question_type: 2, answer: 'A,B', is_correct: true, score_awarded: 15, auto_graded: true },
      { question_id: 3, question_type: 3, answer: 'true', is_correct: false, score_awarded: 0, auto_graded: true },
      { question_id: 4, question_type: 4, answer: '生命周期包含...', is_correct: null, score_awarded: 0, auto_graded: false },
      { question_id: 5, question_type: 5, answer: '用户、商业、技术', is_correct: null, score_awarded: 0, auto_graded: false },
    ],
    objective_score: 25,
    subjective_score: null,
    total_score: null,
    submitted_at: '2026-07-02T08:00:00Z',
    status: 3,
  }

  beforeEach(() => {
    composable = useExamReview()
  })

  describe('openReviewModal replaces inline openReviewModal/openReview', () => {
    it('populates allAnswers and initializes scores from full record', async () => {
      await composable.openReviewModal(mockRecord)

      expect(composable.allAnswers.value).toHaveLength(5)
      expect(composable.scores.value).toEqual({
        1: 10, 2: 15, 3: 0, 4: 0, 5: 0,
      })
    })

    it('initializes correctness: is_correct from API, null defaults to false', async () => {
      await composable.openReviewModal(mockRecord)

      expect(composable.correctness.value).toEqual({
        1: true, 2: true, 3: false, 4: false, 5: false,
      })
    })

    it('clears comment', async () => {
      composable.comment.value = '旧评语'
      await composable.openReviewModal(mockRecord)
      expect(composable.comment.value).toBe('')
    })
  })

  describe('isAllAutoGraded replaces inline computed', () => {
    it('returns false when some answers need manual grading', async () => {
      await composable.openReviewModal(mockRecord)
      expect(composable.isAllAutoGraded.value).toBe(false)
    })

    it('returns true when all answers auto-graded', async () => {
      const autoGradedRecord = {
        ...mockRecord,
        answers: mockRecord.answers.filter(a => a.auto_graded),
      }
      await composable.openReviewModal(autoGradedRecord)
      expect(composable.isAllAutoGraded.value).toBe(true)
    })
  })

  describe('isChoiceType replaces inline isChoiceType', () => {
    it('returns true for single/multiple/truefalse, false for short_answer/fill_blank', async () => {
      await composable.openReviewModal(mockRecord)

      expect(composable.isChoiceType(1)).toBe(true)  // single
      expect(composable.isChoiceType(2)).toBe(true)  // multiple
      expect(composable.isChoiceType(3)).toBe(true)  // truefalse
      expect(composable.isChoiceType(4)).toBe(false) // short_answer
      expect(composable.isChoiceType(5)).toBe(false) // fill_blank
    })
  })

  describe('question helpers replace inline findQuestion/getQuestionContent/etc.', () => {
    it('findQuestion returns correct question', async () => {
      await composable.openReviewModal(mockRecord)
      expect(composable.findQuestion(1)?.content).toBe('什么是产品?')
      expect(composable.findQuestion(999)).toBeUndefined()
    })

    it('getQuestionContent returns content or empty', async () => {
      await composable.openReviewModal(mockRecord)
      expect(composable.getQuestionContent(1)).toBe('什么是产品?')
      expect(composable.getQuestionContent(999)).toBe('')
    })

    it('getQuestionScore returns score or 0', async () => {
      await composable.openReviewModal(mockRecord)
      expect(composable.getQuestionScore(1)).toBe(10)
      expect(composable.getQuestionScore(2)).toBe(15)
      expect(composable.getQuestionScore(999)).toBe(0)
    })

    it('getQuestionIndex returns 1-based index', async () => {
      await composable.openReviewModal(mockRecord)
      expect(composable.getQuestionIndex(1)).toBe(1)
      expect(composable.getQuestionIndex(5)).toBe(5)
      expect(composable.getQuestionIndex(999)).toBe(0)
    })

    it('getCorrectAnswer parses fill-blank JSON', async () => {
      await composable.openReviewModal(mockRecord)
      expect(composable.getCorrectAnswer(5)).toBe('用户、商业、技术')
    })

    it('getQuestionTypeLabel returns correct labels', async () => {
      await composable.openReviewModal(mockRecord)
      expect(composable.getQuestionTypeLabel(1)).toBe('单选题')
      expect(composable.getQuestionTypeLabel(2)).toBe('多选题')
      expect(composable.getQuestionTypeLabel(3)).toBe('判断题')
      expect(composable.getQuestionTypeLabel(4)).toBe('简答题')
      expect(composable.getQuestionTypeLabel(5)).toBe('填空题')
    })

    it('isFillBlank returns true only for type 5', async () => {
      await composable.openReviewModal(mockRecord)
      expect(composable.isFillBlank(5)).toBe(true)
      expect(composable.isFillBlank(1)).toBe(false)
    })

    it('parseCorrectAnswers parses fill-blank JSON array', async () => {
      await composable.openReviewModal(mockRecord)
      expect(composable.parseCorrectAnswers(5)).toEqual(['用户', '商业', '技术'])
      expect(composable.parseCorrectAnswers(1)).toEqual(['D'])
    })
  })

  describe('updateScore/updateCorrectness replace inline v-model handlers', () => {
    it('updateScore modifies scores reactively', async () => {
      await composable.openReviewModal(mockRecord)
      composable.updateScore(4, 18)
      expect(composable.scores.value[4]).toBe(18)
      expect(composable.totalScore.value).toBe(43) // 10+15+0+18+0
    })

    it('updateCorrectness modifies correctness reactively', async () => {
      await composable.openReviewModal(mockRecord)
      composable.updateCorrectness(4, true)
      expect(composable.correctness.value[4]).toBe(true)
    })
  })

  describe('getReviewPayload replaces inline review submission', () => {
    it('returns payload with all scores, correctness, comment', async () => {
      await composable.openReviewModal(mockRecord)
      composable.comment.value = '很好'
      composable.updateScore(4, 15)
      composable.updateCorrectness(4, true)

      const payload = composable.getReviewPayload()
      expect(payload.scores[4]).toBe(15)
      expect(payload.correctness[4]).toBe(true)
      expect(payload.comment).toBe('很好')
      expect(payload.action).toBe('approve')
    })
  })

  describe('resetReview replaces inline state clearing', () => {
    it('resets all state to initial values', async () => {
      await composable.openReviewModal(mockRecord)
      composable.comment.value = '评语'
      composable.updateScore(4, 10)

      composable.resetReview()

      expect(composable.allAnswers.value).toEqual([])
      expect(composable.scores.value).toEqual({})
      expect(composable.correctness.value).toEqual({})
      expect(composable.comment.value).toBe('')
      expect(composable.reviewingRecord.value).toBeNull()
    })
  })
})
