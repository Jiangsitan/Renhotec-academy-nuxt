/**
 * 格式化分数：80.0 → 80，80.5 → 80.5，7.3 → 7.5
 * 精确到 0.5，只有整数和 .5 小数
 */
export const formatScore = (score: number | string | null | undefined): string => {
  if (score === null || score === undefined) return '0'
  const num = typeof score === 'string' ? parseFloat(score) : score
  if (isNaN(num)) return '0'
  const rounded = Math.round(num * 2) / 2
  return rounded % 1 === 0 ? rounded.toFixed(0) : rounded.toFixed(1)
}
