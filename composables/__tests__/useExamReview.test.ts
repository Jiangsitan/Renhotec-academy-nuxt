import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useExamReview } from '../useExamReview'

// Mock data for testing
const mockExam = {
  id: 1,
  title: '测试考试',
  passing_score: 60,
  questions: [
    {
      id: 1,
      type: 1, // 单选题
      content: '什么是 JavaScript？',
      options: ['A. 编程语言', 'B. 标记语言', 'C. 样式表', 'D. 数据库'],
      correct_answer: 'A',
      score: 10,
    },
    {
      id: 2,
      type: 2, // 多选题
      content: '以下哪些是编程语言？',
      options: ['A. JavaScript', 'B. HTML', 'C. Python', 'D. CSS'],
      correct_answer: 'A,C',
      score: 15,
    },
    {
      id: 3,
      type: 3, // 判断题
      content: 'HTML 是编程语言',
      correct_answer: 'false',
      score: 5,
    },
    {
      id: 4,
      type: 4, // 简答题
      content: '请简述什么是面向对象编程',
      correct_answer: '面向对象编程是一种编程范式...',
      score: 20,
    },
    {
      id: 5,
      type: 5, // 填空题
      content: 'JavaScript 的创始人是（）',
      correct_answer: '["Brendan Eich"]',
      score: 10,
    },
  ],
}

const mockAnswers = [
  { question_id: 1, question_type: 1, answer: 'A', is_correct: true, score_awarded: 10, auto_graded: true },
  { question_id: 2, question_type: 2, answer: 'A,C', is_correct: true, score_awarded: 15, auto_graded: true },
  { question_id: 3, question_type: 3, answer: 'false', is_correct: true, score_awarded: 5, auto_graded: true },
  { question_id: 4, question_type: 4, answer: '面向对象编程是一种编程范式...', is_correct: null, score_awarded: 0, auto_graded: false },
  { question_id: 5, question_type: 5, answer: 'Brendan Eich', is_correct: null, score_awarded: 0, auto_graded: false },
]

const mockRecord = {
  id: 100,
  user: { name: '张三', employee_no: 'EMP001', department: '技术部' },
  exam: mockExam,
  answers: mockAnswers,
  objective_score: 30,
  subjective_score: null,
  total_score: null,
  submitted_at: '2026-07-01T10:00:00Z',
  status: 3,
}

describe('useExamReview', () => {
  let composable: ReturnType<typeof useExamReview>

  beforeEach(() => {
    composable = useExamReview()
  })

  // ========== Initial State ==========
  describe('initial state', () => {
    it('initializes allAnswers as empty array', () => {
      expect(composable.allAnswers.value).toEqual([])
    })

    it('initializes scores as empty object', () => {
      expect(composable.scores.value).toEqual({})
    })

    it('initializes correctness as empty object', () => {
      expect(composable.correctness.value).toEqual({})
    })

    it('initializes comment as empty string', () => {
      expect(composable.comment.value).toBe('')
    })

    it('initializes reviewingRecord as null', () => {
      expect(composable.reviewingRecord.value).toBeNull()
    })
  })

  // ========== openReviewModal ==========
  describe('openReviewModal', () => {
    it('sets reviewingRecord from provided record', async () => {
      await composable.openReviewModal(mockRecord)
      expect(composable.reviewingRecord.value).not.toBeNull()
      expect(composable.reviewingRecord.value?.id).toBe(mockRecord.id)
    })

    it('populates allAnswers from record answers', async () => {
      await composable.openReviewModal(mockRecord)
      expect(composable.allAnswers.value).toHaveLength(5)
    })

    it('initializes scores for each answer', async () => {
      await composable.openReviewModal(mockRecord)
      expect(composable.scores.value[1]).toBe(10)
      expect(composable.scores.value[2]).toBe(15)
      expect(composable.scores.value[3]).toBe(5)
      expect(composable.scores.value[4]).toBe(0)
      expect(composable.scores.value[5]).toBe(0)
    })

    it('initializes correctness for each answer', async () => {
      await composable.openReviewModal(mockRecord)
      expect(composable.correctness.value[1]).toBe(true)
      expect(composable.correctness.value[2]).toBe(true)
      expect(composable.correctness.value[3]).toBe(true)
      expect(composable.correctness.value[4]).toBe(false) // null defaults to false
      expect(composable.correctness.value[5]).toBe(false) // null defaults to false
    })

    it('clears previous comment', async () => {
      composable.comment.value = '之前的评语'
      await composable.openReviewModal(mockRecord)
      expect(composable.comment.value).toBe('')
    })
  })

  // ========== subjectiveAnswers (computed) ==========
  describe('subjectiveAnswers', () => {
    it('filters answers where is_correct is null', async () => {
      await composable.openReviewModal(mockRecord)
      expect(composable.subjectiveAnswers.value).toHaveLength(2)
      expect(composable.subjectiveAnswers.value.map((a: any) => a.question_id)).toEqual([4, 5])
    })

    it('returns empty array when no subjective answers', async () => {
      const recordWithAllAutoGraded = {
        ...mockRecord,
        answers: mockAnswers.filter(a => a.auto_graded),
      }
      await composable.openReviewModal(recordWithAllAutoGraded)
      expect(composable.subjectiveAnswers.value).toHaveLength(0)
    })
  })

  // ========== isAllAutoGraded (computed) ==========
  describe('isAllAutoGraded', () => {
    it('returns true when all answers are auto-graded', async () => {
      const recordWithAllAutoGraded = {
        ...mockRecord,
        answers: mockAnswers.filter(a => a.auto_graded),
      }
      await composable.openReviewModal(recordWithAllAutoGraded)
      expect(composable.isAllAutoGraded.value).toBe(true)
    })

    it('returns false when some answers need manual grading', async () => {
      await composable.openReviewModal(mockRecord)
      expect(composable.isAllAutoGraded.value).toBe(false)
    })

    it('returns false when no answers', () => {
      expect(composable.isAllAutoGraded.value).toBe(false)
    })
  })

  // ========== totalScore (computed) ==========
  describe('totalScore', () => {
    it('calculates sum of all assigned scores', async () => {
      await composable.openReviewModal(mockRecord)
      // Initial: 10 + 15 + 5 + 0 + 0 = 30
      expect(composable.totalScore.value).toBe(30)
    })

    it('updates when scores change', async () => {
      await composable.openReviewModal(mockRecord)
      // Initial: 10 + 15 + 5 + 0 + 0 = 30
      composable.updateScore(4, 15) // +15
      composable.updateScore(5, 8) // +8
      expect(composable.totalScore.value).toBe(53) // 30 + 15 + 8 = 53
    })

    it('returns 0 when no answers', () => {
      expect(composable.totalScore.value).toBe(0)
    })
  })

  // ========== maxScore (computed) ==========
  describe('maxScore', () => {
    it('returns sum of all question scores', async () => {
      await composable.openReviewModal(mockRecord)
      // 10 + 15 + 5 + 20 + 10 = 60
      expect(composable.maxScore.value).toBe(60)
    })

    it('returns 0 when no record loaded', () => {
      expect(composable.maxScore.value).toBe(0)
    })
  })

  // ========== isFullyGraded (computed) ==========
  describe('isFullyGraded', () => {
    it('returns true when all answers have correctness values', async () => {
      await composable.openReviewModal(mockRecord)
      expect(composable.isFullyGraded.value).toBe(true)
    })

    it('returns false when no answers', () => {
      expect(composable.isFullyGraded.value).toBe(false)
    })
  })

  // ========== findQuestion ==========
  describe('findQuestion', () => {
    it('returns question by id', async () => {
      await composable.openReviewModal(mockRecord)
      const question = composable.findQuestion(1)
      expect(question).toBeDefined()
      expect(question?.id).toBe(1)
      expect(question?.type).toBe(1)
    })

    it('returns undefined for non-existent question', async () => {
      await composable.openReviewModal(mockRecord)
      const question = composable.findQuestion(999)
      expect(question).toBeUndefined()
    })

    it('returns undefined when no record loaded', () => {
      const question = composable.findQuestion(1)
      expect(question).toBeUndefined()
    })
  })

  // ========== getQuestionContent ==========
  describe('getQuestionContent', () => {
    it('returns question content by id', async () => {
      await composable.openReviewModal(mockRecord)
      const content = composable.getQuestionContent(1)
      expect(content).toBe('什么是 JavaScript？')
    })

    it('returns empty string for non-existent question', async () => {
      await composable.openReviewModal(mockRecord)
      const content = composable.getQuestionContent(999)
      expect(content).toBe('')
    })

    it('returns empty string when no record loaded', () => {
      const content = composable.getQuestionContent(1)
      expect(content).toBe('')
    })
  })

  // ========== getQuestionScore ==========
  describe('getQuestionScore', () => {
    it('returns question score by id', async () => {
      await composable.openReviewModal(mockRecord)
      expect(composable.getQuestionScore(1)).toBe(10)
      expect(composable.getQuestionScore(2)).toBe(15)
      expect(composable.getQuestionScore(3)).toBe(5)
    })

    it('returns 0 for non-existent question', async () => {
      await composable.openReviewModal(mockRecord)
      expect(composable.getQuestionScore(999)).toBe(0)
    })

    it('returns 0 when no record loaded', () => {
      expect(composable.getQuestionScore(1)).toBe(0)
    })
  })

  // ========== getQuestionIndex ==========
  describe('getQuestionIndex', () => {
    it('returns 1-based index for question', async () => {
      await composable.openReviewModal(mockRecord)
      expect(composable.getQuestionIndex(1)).toBe(1)
      expect(composable.getQuestionIndex(2)).toBe(2)
      expect(composable.getQuestionIndex(5)).toBe(5)
    })

    it('returns 0 for non-existent question', async () => {
      await composable.openReviewModal(mockRecord)
      expect(composable.getQuestionIndex(999)).toBe(0)
    })

    it('returns 0 when no record loaded', () => {
      expect(composable.getQuestionIndex(1)).toBe(0)
    })
  })

  // ========== getCorrectAnswer ==========
  describe('getCorrectAnswer', () => {
    it('returns correct answer for single choice', async () => {
      await composable.openReviewModal(mockRecord)
      expect(composable.getCorrectAnswer(1)).toBe('A')
    })

    it('returns correct answer for multiple choice', async () => {
      await composable.openReviewModal(mockRecord)
      expect(composable.getCorrectAnswer(2)).toBe('A,C')
    })

    it('returns correct answer for true/false', async () => {
      await composable.openReviewModal(mockRecord)
      expect(composable.getCorrectAnswer(3)).toBe('false')
    })

    it('returns correct answer for short answer', async () => {
      await composable.openReviewModal(mockRecord)
      expect(composable.getCorrectAnswer(4)).toContain('面向对象编程')
    })

    it('parses fill-blank JSON array and joins with 、', async () => {
      await composable.openReviewModal(mockRecord)
      expect(composable.getCorrectAnswer(5)).toBe('Brendan Eich')
    })

    it('returns empty string for non-existent question', async () => {
      await composable.openReviewModal(mockRecord)
      expect(composable.getCorrectAnswer(999)).toBe('')
    })

    it('returns raw string for fill-blank with invalid JSON', async () => {
      const recordWithInvalidJson = {
        ...mockRecord,
        exam: {
          ...mockExam,
          questions: [
            ...mockExam.questions.slice(0, 4),
            {
              id: 5,
              type: 5,
              content: '填空题',
              correct_answer: 'not-valid-json',
              score: 10,
            },
          ],
        },
      }
      await composable.openReviewModal(recordWithInvalidJson)
      expect(composable.getCorrectAnswer(5)).toBe('not-valid-json')
    })

    it('returns raw string for fill-blank with non-array JSON', async () => {
      const recordWithNonArrayJson = {
        ...mockRecord,
        exam: {
          ...mockExam,
          questions: [
            ...mockExam.questions.slice(0, 4),
            {
              id: 5,
              type: 5,
              content: '填空题',
              correct_answer: '{"key": "value"}',
              score: 10,
            },
          ],
        },
      }
      await composable.openReviewModal(recordWithNonArrayJson)
      expect(composable.getCorrectAnswer(5)).toBe('{"key": "value"}')
    })
  })

  // ========== getQuestionTypeLabel ==========
  describe('getQuestionTypeLabel', () => {
    it('returns correct type labels', async () => {
      await composable.openReviewModal(mockRecord)
      expect(composable.getQuestionTypeLabel(1)).toBe('单选题')
      expect(composable.getQuestionTypeLabel(2)).toBe('多选题')
      expect(composable.getQuestionTypeLabel(3)).toBe('判断题')
      expect(composable.getQuestionTypeLabel(4)).toBe('简答题')
      expect(composable.getQuestionTypeLabel(5)).toBe('填空题')
    })

    it('returns 主观题 for unknown type', async () => {
      const recordWithUnknownType = {
        ...mockRecord,
        exam: {
          ...mockExam,
          questions: [{ id: 1, type: 99, content: 'test', score: 10 }],
        },
      }
      await composable.openReviewModal(recordWithUnknownType)
      expect(composable.getQuestionTypeLabel(1)).toBe('主观题')
    })
  })

  // ========== isFillBlank ==========
  describe('isFillBlank', () => {
    it('returns true for fill-blank questions', async () => {
      await composable.openReviewModal(mockRecord)
      expect(composable.isFillBlank(5)).toBe(true)
    })

    it('returns false for non-fill-blank questions', async () => {
      await composable.openReviewModal(mockRecord)
      expect(composable.isFillBlank(1)).toBe(false)
      expect(composable.isFillBlank(2)).toBe(false)
      expect(composable.isFillBlank(3)).toBe(false)
      expect(composable.isFillBlank(4)).toBe(false)
    })

    it('returns false for non-existent question', async () => {
      await composable.openReviewModal(mockRecord)
      expect(composable.isFillBlank(999)).toBe(false)
    })
  })

  // ========== isChoiceType ==========
  describe('isChoiceType', () => {
    it('returns true for single choice', async () => {
      await composable.openReviewModal(mockRecord)
      expect(composable.isChoiceType(1)).toBe(true)
    })

    it('returns true for multiple choice', async () => {
      await composable.openReviewModal(mockRecord)
      expect(composable.isChoiceType(2)).toBe(true)
    })

    it('returns true for true/false', async () => {
      await composable.openReviewModal(mockRecord)
      expect(composable.isChoiceType(3)).toBe(true)
    })

    it('returns false for short answer', async () => {
      await composable.openReviewModal(mockRecord)
      expect(composable.isChoiceType(4)).toBe(false)
    })

    it('returns false for fill-blank', async () => {
      await composable.openReviewModal(mockRecord)
      expect(composable.isChoiceType(5)).toBe(false)
    })
  })

  // ========== parseCorrectAnswers ==========
  describe('parseCorrectAnswers', () => {
    it('returns array for fill-blank question', async () => {
      await composable.openReviewModal(mockRecord)
      const answers = composable.parseCorrectAnswers(5)
      expect(answers).toEqual(['Brendan Eich'])
    })

    it('returns single-element array for non-fill-blank', async () => {
      await composable.openReviewModal(mockRecord)
      const answers = composable.parseCorrectAnswers(1)
      expect(answers).toEqual(['A'])
    })

    it('returns empty array for non-existent question', async () => {
      await composable.openReviewModal(mockRecord)
      const answers = composable.parseCorrectAnswers(999)
      expect(answers).toEqual([])
    })

    it('handles multiple fill-blank answers', async () => {
      const recordWithMultiBlank = {
        ...mockRecord,
        exam: {
          ...mockExam,
          questions: [
            ...mockExam.questions.slice(0, 4),
            {
              id: 5,
              type: 5,
              content: '（）和（）是前端三大技术',
              correct_answer: '["HTML", "CSS", "JavaScript"]',
              score: 10,
            },
          ],
        },
      }
      await composable.openReviewModal(recordWithMultiBlank)
      const answers = composable.parseCorrectAnswers(5)
      expect(answers).toEqual(['HTML', 'CSS', 'JavaScript'])
    })

    it('returns single-element array for fill-blank with invalid JSON', async () => {
      const recordWithInvalidJson = {
        ...mockRecord,
        exam: {
          ...mockExam,
          questions: [
            ...mockExam.questions.slice(0, 4),
            {
              id: 5,
              type: 5,
              content: '填空题',
              correct_answer: 'not-valid-json',
              score: 10,
            },
          ],
        },
      }
      await composable.openReviewModal(recordWithInvalidJson)
      const answers = composable.parseCorrectAnswers(5)
      expect(answers).toEqual(['not-valid-json'])
    })

    it('returns single-element array for fill-blank with non-array JSON', async () => {
      const recordWithNonArrayJson = {
        ...mockRecord,
        exam: {
          ...mockExam,
          questions: [
            ...mockExam.questions.slice(0, 4),
            {
              id: 5,
              type: 5,
              content: '填空题',
              correct_answer: '{"key": "value"}',
              score: 10,
            },
          ],
        },
      }
      await composable.openReviewModal(recordWithNonArrayJson)
      const answers = composable.parseCorrectAnswers(5)
      expect(answers).toEqual(['{"key": "value"}'])
    })
  })

  // ========== updateScore ==========
  describe('updateScore', () => {
    it('updates score for a question', async () => {
      await composable.openReviewModal(mockRecord)
      composable.updateScore(4, 15)
      expect(composable.scores.value[4]).toBe(15)
    })

    it('allows updating to 0', async () => {
      await composable.openReviewModal(mockRecord)
      composable.updateScore(1, 0)
      expect(composable.scores.value[1]).toBe(0)
    })
  })

  // ========== updateCorrectness ==========
  describe('updateCorrectness', () => {
    it('updates correctness for a question', async () => {
      await composable.openReviewModal(mockRecord)
      composable.updateCorrectness(4, true)
      expect(composable.correctness.value[4]).toBe(true)
    })

    it('allows setting to false', async () => {
      await composable.openReviewModal(mockRecord)
      composable.updateCorrectness(1, false)
      expect(composable.correctness.value[1]).toBe(false)
    })
  })

  // ========== getReviewPayload ==========
  describe('getReviewPayload', () => {
    it('returns correct payload structure', async () => {
      await composable.openReviewModal(mockRecord)
      composable.comment.value = '批改评语'
      
      const payload = composable.getReviewPayload()
      
      expect(payload).toHaveProperty('scores')
      expect(payload).toHaveProperty('correctness')
      expect(payload).toHaveProperty('comment')
      expect(payload).toHaveProperty('action')
      expect(payload.comment).toBe('批改评语')
      expect(payload.action).toBe('approve')
    })

    it('includes all scores', async () => {
      await composable.openReviewModal(mockRecord)
      const payload = composable.getReviewPayload()
      
      expect(Object.keys(payload.scores)).toHaveLength(5)
      expect(payload.scores[1]).toBe(10)
      expect(payload.scores[2]).toBe(15)
    })

    it('includes all correctness values', async () => {
      await composable.openReviewModal(mockRecord)
      const payload = composable.getReviewPayload()
      
      expect(Object.keys(payload.correctness)).toHaveLength(5)
      expect(payload.correctness[1]).toBe(true)
      expect(payload.correctness[4]).toBe(false)
    })
  })

  // ========== getQuestionOptions ==========
  describe('getQuestionOptions', () => {
    it('returns options array for a choice question', async () => {
      await composable.openReviewModal(mockRecord)
      const options = composable.getQuestionOptions(1)
      expect(options).toEqual(['A. 编程语言', 'B. 标记语言', 'C. 样式表', 'D. 数据库'])
    })

    it('returns options for multiple choice question', async () => {
      await composable.openReviewModal(mockRecord)
      const options = composable.getQuestionOptions(2)
      expect(options).toEqual(['A. JavaScript', 'B. HTML', 'C. Python', 'D. CSS'])
    })

    it('returns empty array for question without options (true/false)', async () => {
      await composable.openReviewModal(mockRecord)
      const options = composable.getQuestionOptions(3)
      expect(options).toEqual([])
    })

    it('returns empty array for non-existent question', async () => {
      await composable.openReviewModal(mockRecord)
      const options = composable.getQuestionOptions(999)
      expect(options).toEqual([])
    })

    it('returns empty array when no record loaded', () => {
      const options = composable.getQuestionOptions(1)
      expect(options).toEqual([])
    })
  })

  // ========== isCorrectOption ==========
  describe('isCorrectOption', () => {
    it('returns true for correct single-choice option', async () => {
      await composable.openReviewModal(mockRecord)
      expect(composable.isCorrectOption(1, 'A')).toBe(true)
    })

    it('returns false for wrong single-choice option', async () => {
      await composable.openReviewModal(mockRecord)
      expect(composable.isCorrectOption(1, 'B')).toBe(false)
    })

    it('returns true for correct option in multiple-choice (comma-separated)', async () => {
      await composable.openReviewModal(mockRecord)
      // correct_answer is 'A,C'
      expect(composable.isCorrectOption(2, 'A')).toBe(true)
      expect(composable.isCorrectOption(2, 'C')).toBe(true)
    })

    it('returns false for wrong option in multiple-choice', async () => {
      await composable.openReviewModal(mockRecord)
      expect(composable.isCorrectOption(2, 'B')).toBe(false)
      expect(composable.isCorrectOption(2, 'D')).toBe(false)
    })

    it('returns true/false for true/false question', async () => {
      await composable.openReviewModal(mockRecord)
      // correct_answer is 'false'
      expect(composable.isCorrectOption(3, 'false')).toBe(true)
      expect(composable.isCorrectOption(3, 'true')).toBe(false)
    })

    it('returns false for non-existent question', async () => {
      await composable.openReviewModal(mockRecord)
      expect(composable.isCorrectOption(999, 'A')).toBe(false)
    })
  })

  // ========== getSelectedOptions ==========
  describe('getSelectedOptions', () => {
    it('parses single-choice answer into array', async () => {
      await composable.openReviewModal(mockRecord)
      const answer = mockAnswers[0] // question_id: 1, answer: 'A'
      const selected = composable.getSelectedOptions(answer)
      expect(selected).toEqual(['A'])
    })

    it('parses comma-separated multiple-choice answer into array', async () => {
      await composable.openReviewModal(mockRecord)
      const answer = mockAnswers[1] // question_id: 2, answer: 'A,C'
      const selected = composable.getSelectedOptions(answer)
      expect(selected).toEqual(['A', 'C'])
    })

    it('parses true/false answer into array', async () => {
      await composable.openReviewModal(mockRecord)
      const answer = mockAnswers[2] // question_id: 3, answer: 'false'
      const selected = composable.getSelectedOptions(answer)
      expect(selected).toEqual(['false'])
    })

    it('returns empty array for empty answer string', async () => {
      await composable.openReviewModal(mockRecord)
      const selected = composable.getSelectedOptions({ question_id: 1, question_type: 1, answer: '', is_correct: true, score_awarded: 10, auto_graded: true })
      expect(selected).toEqual([])
    })

    it('trims whitespace from parsed options', async () => {
      await composable.openReviewModal(mockRecord)
      const selected = composable.getSelectedOptions({ question_id: 2, question_type: 2, answer: 'A , C , D', is_correct: null, score_awarded: 0, auto_graded: true })
      expect(selected).toEqual(['A', 'C', 'D'])
    })
  })

  // ========== getOptionClass ==========
  describe('getOptionClass', () => {
    it('returns correct class for correct selected option', async () => {
      await composable.openReviewModal(mockRecord)
      // answer: 'A', correct_answer: 'A'
      const answer = mockAnswers[0] // question_id: 1, answer: 'A'
      const cls = composable.getOptionClass(answer, 'A')
      expect(cls).toBe('option-correct')
    })

    it('returns wrong class for wrong selected option', async () => {
      await composable.openReviewModal(mockRecord)
      const wrongAnswer = { question_id: 1, question_type: 1, answer: 'B', is_correct: false, score_awarded: 0, auto_graded: true }
      const cls = composable.getOptionClass(wrongAnswer, 'B')
      expect(cls).toBe('option-wrong')
    })

    it('returns empty string for unselected option', async () => {
      await composable.openReviewModal(mockRecord)
      const answer = mockAnswers[0] // question_id: 1, answer: 'A'
      const cls = composable.getOptionClass(answer, 'B')
      expect(cls).toBe('')
    })

    it('handles multiple-choice answer with mixed correct/wrong selections', async () => {
      await composable.openReviewModal(mockRecord)
      // question 2: answer 'A,C', correct 'A,C' — A is correct, C is correct
      const answer = mockAnswers[1] // question_id: 2, answer: 'A,C'
      expect(composable.getOptionClass(answer, 'A')).toBe('option-correct')
      expect(composable.getOptionClass(answer, 'C')).toBe('option-correct')
      expect(composable.getOptionClass(answer, 'B')).toBe('')
      expect(composable.getOptionClass(answer, 'D')).toBe('')
    })

    it('returns wrong class when student selected incorrect option in multiple-choice', async () => {
      await composable.openReviewModal(mockRecord)
      // student answered 'A,B' but correct is 'A,C' — B is wrong
      const mixedAnswer = { question_id: 2, question_type: 2, answer: 'A,B', is_correct: false, score_awarded: 0, auto_graded: true }
      expect(composable.getOptionClass(mixedAnswer, 'A')).toBe('option-correct')
      expect(composable.getOptionClass(mixedAnswer, 'B')).toBe('option-wrong')
    })
  })

  // ========== resetReview ==========
  describe('resetReview', () => {
    it('clears all review state', async () => {
      await composable.openReviewModal(mockRecord)
      composable.comment.value = 'some comment'
      
      composable.resetReview()
      
      expect(composable.allAnswers.value).toEqual([])
      expect(composable.scores.value).toEqual({})
      expect(composable.correctness.value).toEqual({})
      expect(composable.comment.value).toBe('')
      expect(composable.reviewingRecord.value).toBeNull()
    })
  })
})
