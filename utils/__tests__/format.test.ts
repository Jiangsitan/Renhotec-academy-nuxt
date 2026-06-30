import { describe, it, expect } from 'vitest'
import { formatScore } from '../format'

describe('formatScore', () => {
  // ========== Happy Path ==========
  it('formats integer scores without decimals', () => {
    expect(formatScore(80)).toBe('80')
  })

  it('formats .5 scores correctly', () => {
    expect(formatScore(80.5)).toBe('80.5')
  })

  it('rounds to nearest 0.5', () => {
    expect(formatScore(80.3)).toBe('80.5')
    expect(formatScore(80.7)).toBe('80.5')
  })

  it('formats 0 correctly', () => {
    expect(formatScore(0)).toBe('0')
  })

  it('formats 100 correctly', () => {
    expect(formatScore(100)).toBe('100')
  })

  // ========== String Input ==========
  it('handles string numbers', () => {
    expect(formatScore('80')).toBe('80')
    expect(formatScore('80.5')).toBe('80.5')
  })

  it('handles numeric strings with rounding', () => {
    expect(formatScore('80.3')).toBe('80.5')
  })

  // ========== Edge Cases ==========
  it('returns 0 for null', () => {
    expect(formatScore(null)).toBe('0')
  })

  it('returns 0 for undefined', () => {
    expect(formatScore(undefined)).toBe('0')
  })

  it('returns 0 for NaN string', () => {
    expect(formatScore('abc')).toBe('0')
  })

  it('returns 0 for empty string', () => {
    expect(formatScore('')).toBe('0')
  })

  // ========== Boundary Values ==========
  it('handles negative scores', () => {
    expect(formatScore(-5)).toBe('-5')
    expect(formatScore(-5.3)).toBe('-5.5')
  })

  it('handles very large scores', () => {
    expect(formatScore(999.5)).toBe('999.5')
  })

  it('handles decimal precision edge cases', () => {
    // 0.25 should round to 0.5 (closer to 0.5 than 0)
    expect(formatScore(0.25)).toBe('0.5')
    // 0.75 should round to 1.0 (closer to 1 than 0.5)
    expect(formatScore(0.75)).toBe('1')
  })
})
