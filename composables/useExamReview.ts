import { ref, computed } from 'vue'
import { QUESTION_TYPE, QUESTION_TYPE_LABELS, isChoiceType as checkChoiceType, normalizeQuestionType } from '~/utils/questionType'

// Types
export interface ExamQuestion {
  id: number
  type: number
  content: string
  options?: string[]
  correct_answer: string
  score: number
}

export interface ExamAnswer {
  question_id: number
  question_type: number
  answer: string
  is_correct: boolean | null
  score_awarded: number | null
  auto_graded: boolean
}

export interface ExamRecord {
  id: number
  user: {
    name: string
    employee_no: string
    department: string
  }
  exam: {
    id: number
    title: string
    passing_score: number
    questions: ExamQuestion[]
  }
  answers: ExamAnswer[]
  objective_score: number | null
  subjective_score: number | null
  total_score: number | null
  submitted_at: string
  status: number
}

export interface ReviewPayload {
  scores: Record<number, number>
  correctness: Record<number, boolean>
  comment: string
  action: 'approve' | 'reject'
}

/**
 * Composable for exam review modal logic.
 * Extracted from admin/pending-reviews.vue and mentor/pending.vue.
 * Pure business logic — no Nuxt/DOM dependencies.
 */
export function useExamReview() {
  const allAnswers = ref<ExamAnswer[]>([])
  const scores = ref<Record<number, number>>({})
  const correctness = ref<Record<number, boolean>>({})
  const comment = ref('')
  const reviewingRecord = ref<ExamRecord | null>(null)

  // ========== Computed ==========

  /** Answers that need manual grading (is_correct === null) */
  const subjectiveAnswers = computed(() =>
    allAnswers.value.filter(a => a.is_correct === null),
  )

  /** Whether all answers were auto-graded */
  const isAllAutoGraded = computed(() =>
    allAnswers.value.length > 0 && allAnswers.value.every(a => a.auto_graded),
  )

  /** Sum of all assigned scores */
  const totalScore = computed(() =>
    Object.values(scores.value).reduce((sum, s) => sum + s, 0),
  )

  /** Maximum possible score from the exam */
  const maxScore = computed(() => {
    const questions = reviewingRecord.value?.exam.questions
    if (!questions) return 0
    return questions.reduce((sum, q) => sum + q.score, 0)
  })

  /** Whether all questions have been graded (no null correctness) */
  const isFullyGraded = computed(() =>
    allAnswers.value.length > 0
    && allAnswers.value.every(a => correctness.value[a.question_id] !== undefined),
  )

  // ========== Methods ==========

  /**
   * Open review modal for a given exam record.
   * Populates allAnswers, scores, correctness from the record.
   */
  async function openReviewModal(record: ExamRecord) {
    reviewingRecord.value = record
    allAnswers.value = record.answers

    const initialScores: Record<number, number> = {}
    const initialCorrectness: Record<number, boolean> = {}

    for (const answer of record.answers) {
      initialScores[answer.question_id] = answer.score_awarded ?? 0
      initialCorrectness[answer.question_id] = answer.is_correct ?? false
    }

    scores.value = initialScores
    correctness.value = initialCorrectness
    comment.value = ''
  }

  /** Find a question by id from the loaded record */
  function findQuestion(questionId: number): ExamQuestion | undefined {
    return reviewingRecord.value?.exam.questions.find(q => q.id === questionId)
  }

  /** Get question content by id */
  function getQuestionContent(questionId: number): string {
    return findQuestion(questionId)?.content ?? ''
  }

  /** Get question max score by id */
  function getQuestionScore(questionId: number): number {
    return findQuestion(questionId)?.score ?? 0
  }

  /** Get 1-based question index */
  function getQuestionIndex(questionId: number): number {
    const questions = reviewingRecord.value?.exam.questions
    if (!questions) return 0
    const idx = questions.findIndex(q => q.id === questionId)
    return idx >= 0 ? idx + 1 : 0
  }

  /** Get the correct answer display string for a question */
  function getCorrectAnswer(questionId: number): string {
    const question = findQuestion(questionId)
    if (!question) return ''

    // Fill-blank: parse JSON array and join
    if (question.type === QUESTION_TYPE.FILL_BLANK) {
      try {
        const parsed = JSON.parse(question.correct_answer)
        if (Array.isArray(parsed)) {
          return parsed.join('、')
        }
      }
      catch {
        return question.correct_answer
      }
    }

    return question.correct_answer
  }

  /** Get the type label for a question */
  function getQuestionTypeLabel(questionId: number): string {
    const question = findQuestion(questionId)
    if (!question) return '主观题'
    return QUESTION_TYPE_LABELS[question.type] ?? '主观题'
  }

  /** Check if question is fill-blank type */
  function isFillBlank(questionId: number): boolean {
    const question = findQuestion(questionId)
    return question?.type === QUESTION_TYPE.FILL_BLANK
  }

  /** Check if question is a choice type (single/multiple/true-false) */
  function isChoiceType(questionId: number): boolean {
    const question = findQuestion(questionId)
    if (!question) return false
    return checkChoiceType(question.type)
  }

  /**
   * Parse correct answers for fill-blank question into array.
   * For non-fill-blank questions, wraps the string in a single-element array.
   */
  function parseCorrectAnswers(questionId: number): string[] {
    const question = findQuestion(questionId)
    if (!question) return []

    if (question.type === QUESTION_TYPE.FILL_BLANK) {
      try {
        const parsed = JSON.parse(question.correct_answer)
        if (Array.isArray(parsed)) {
          return parsed.map(String)
        }
        return [question.correct_answer]
      }
      catch {
        return [question.correct_answer]
      }
    }

    return [question.correct_answer]
  }

  // ========== Option display helpers ==========

  /** Get the options array for a question (empty if not a choice type) */
  function getQuestionOptions(questionId: number): string[] {
    const question = findQuestion(questionId)
    return question?.options ?? []
  }

  /**
   * Check if a specific option key matches the correct answer.
   * For single-choice: matches exact value (e.g. 'A').
   * For multiple-choice: matches within comma-separated list (e.g. 'A,C' contains 'A').
   * For true/false: matches 'true' or 'false'.
   */
  function isCorrectOption(questionId: number, optionKey: string): boolean {
    const question = findQuestion(questionId)
    if (!question) return false

    const correctAnswer = question.correct_answer
    const type = normalizeQuestionType(question.type)

    if (type === QUESTION_TYPE.MULTIPLE) {
      // comma-separated: 'A,C' → ['A', 'C']
      const correctParts = correctAnswer.split(',').map(s => s.trim())
      return correctParts.includes(optionKey)
    }

    // single-choice, true/false: exact match
    return correctAnswer === optionKey
  }

  /**
   * Parse a student's answer into an array of selected option keys.
   * Handles comma-separated strings (e.g. 'A,C' → ['A', 'C']).
   */
  function getSelectedOptions(answer: ExamAnswer): string[] {
    if (!answer.answer) return []
    return answer.answer.split(',').map(s => s.trim()).filter(Boolean)
  }

  /**
   * Get the CSS class for an option based on whether it was selected and whether it's correct.
   * Returns a Tailwind-compatible class string.
   */
  function getOptionClass(answer: ExamAnswer, optionKey: string): string {
    const selected = getSelectedOptions(answer).includes(optionKey)
    if (!selected) return ''

    const correct = isCorrectOption(answer.question_id, optionKey)
    return correct ? 'option-correct' : 'option-wrong'
  }

  /** Update the score for a specific question */
  function updateScore(questionId: number, score: number) {
    scores.value = { ...scores.value, [questionId]: score }
  }

  /** Update the correctness for a specific question */
  function updateCorrectness(questionId: number, isCorrect: boolean) {
    correctness.value = { ...correctness.value, [questionId]: isCorrect }
  }

  /** Get the review payload for submission */
  function getReviewPayload(): ReviewPayload {
    return {
      scores: { ...scores.value },
      correctness: { ...correctness.value },
      comment: comment.value,
      action: 'approve',
    }
  }

  /** Reset all review state */
  function resetReview() {
    allAnswers.value = []
    scores.value = {}
    correctness.value = {}
    comment.value = ''
    reviewingRecord.value = null
  }

  return {
    // State
    allAnswers,
    scores,
    correctness,
    comment,
    reviewingRecord,

    // Computed
    subjectiveAnswers,
    isAllAutoGraded,
    totalScore,
    maxScore,
    isFullyGraded,

    // Methods
    openReviewModal,
    findQuestion,
    getQuestionContent,
    getQuestionScore,
    getQuestionIndex,
    getCorrectAnswer,
    getQuestionTypeLabel,
    isFillBlank,
    isChoiceType,
    parseCorrectAnswers,
    getQuestionOptions,
    isCorrectOption,
    getSelectedOptions,
    getOptionClass,
    updateScore,
    updateCorrectness,
    getReviewPayload,
    resetReview,
  }
}
