/**
 * 考试记录状态处理工具
 * 从 my-exams.vue 提取的纯逻辑函数
 */

export interface ExamRecordStatus {
  id: number
  status: number
  total_score: number | null
  exam?: {
    passing_score?: number
  }
}

/**
 * 获取状态标签
 */
export const getStatusLabel = (r: ExamRecordStatus): string => {
  if (r.status === 0) return '进行中'
  if (r.status === 1) return '已提交'
  if (r.status === 2) {
    if (r.total_score !== null && r.exam?.passing_score != null) {
      return r.total_score >= r.exam.passing_score ? '通过' : '未通过'
    }
    return '已自动评分'
  }
  if (r.status === 3) return '待批改'
  if (r.status === 4) {
    if (r.total_score !== null && r.exam?.passing_score != null) {
      return r.total_score >= r.exam.passing_score ? '通过' : '未通过'
    }
    return '已完成'
  }
  if (r.status === 5) return '已驳回'
  if (r.status === 6) return '已重考'
  return String(r.status)
}

/**
 * 获取状态CSS类名
 */
export const getStatusClass = (r: ExamRecordStatus): string => {
  if (r.status === 0) return 'bg-gray-100 text-gray-600'
  if (r.status === 1) return 'bg-blue-100 text-blue-600'
  if (r.status === 2) {
    if (r.total_score !== null && r.exam?.passing_score != null) {
      return r.total_score >= r.exam.passing_score
        ? 'bg-green-100 text-green-600'
        : 'bg-red-100 text-red-600'
    }
    return 'bg-cyan-100 text-cyan-600'
  }
  if (r.status === 3) return 'bg-orange-100 text-orange-600'
  if (r.status === 4) {
    if (r.total_score !== null && r.exam?.passing_score != null) {
      return r.total_score >= r.exam.passing_score
        ? 'bg-green-100 text-green-600'
        : 'bg-red-100 text-red-600'
    }
    return 'bg-gray-100 text-gray-500'
  }
  if (r.status === 5) return 'bg-red-100 text-red-600'
  if (r.status === 6) return 'bg-gray-100 text-gray-500'
  return 'bg-gray-100 text-gray-500'
}

/**
 * 获取状态图标
 */
export const getStatusIcon = (r: ExamRecordStatus): string => {
  if (r.status === 0) return 'i-heroicons-pencil-square'
  if (r.status === 1) return 'i-heroicons-paper-airplane'
  if (r.status === 2) {
    if (r.total_score !== null && r.exam?.passing_score != null) {
      return r.total_score >= r.exam.passing_score ? 'i-heroicons-check-circle' : 'i-heroicons-x-circle'
    }
    return 'i-heroicons-calculator'
  }
  if (r.status === 3) return 'i-heroicons-clock'
  if (r.status === 4) {
    if (r.total_score !== null && r.exam?.passing_score != null) {
      return r.total_score >= r.exam.passing_score ? 'i-heroicons-check-circle' : 'i-heroicons-x-circle'
    }
    return 'i-heroicons-clipboard-document-check'
  }
  if (r.status === 5) return 'i-heroicons-exclamation-triangle'
  if (r.status === 6) return 'i-heroicons-arrow-path'
  return 'i-heroicons-clipboard-document-check'
}

/**
 * 获取状态颜色
 */
export const getStatusColor = (r: ExamRecordStatus): string => {
  if (r.status === 0) return 'gray'
  if (r.status === 1) return 'blue'
  if (r.status === 2) {
    if (r.total_score !== null && r.exam?.passing_score != null) {
      return r.total_score >= r.exam.passing_score ? 'green' : 'red'
    }
    return 'cyan'
  }
  if (r.status === 3) return 'orange'
  if (r.status === 4) {
    if (r.total_score !== null && r.exam?.passing_score != null) {
      return r.total_score >= r.exam.passing_score ? 'green' : 'red'
    }
    return 'gray'
  }
  if (r.status === 5) return 'red'
  if (r.status === 6) return 'gray'
  return 'gray'
}

/**
 * 获取分数CSS类名
 */
export const getScoreClass = (r: ExamRecordStatus): string => {
  if (r.status === 0) return 'text-gray-400'
  if (r.status === 1) return 'text-gray-400'
  if (r.status === 2) {
    if (r.total_score !== null && r.exam?.passing_score != null) {
      return r.total_score >= r.exam.passing_score ? 'text-green-600' : 'text-red-500'
    }
    return 'text-cyan-500'
  }
  if (r.status === 3) return 'text-orange-500'
  if (r.status === 4) {
    if (r.total_score !== null && r.exam?.passing_score != null) {
      return r.total_score >= r.exam.passing_score ? 'text-green-600' : 'text-red-500'
    }
    return 'text-gray-400'
  }
  if (r.status === 5) return 'text-red-500'
  if (r.status === 6) return 'text-gray-400'
  return 'text-gray-400'
}
