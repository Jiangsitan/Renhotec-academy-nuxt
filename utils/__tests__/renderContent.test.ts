import { describe, it, expect } from 'vitest'
import { renderHtml, renderContent } from '../renderContent'

const OSS_BASE = 'https://rh-wh.oss-cn-shanghai.aliyuncs.com'

describe('renderHtml', () => {
  // ========== Happy Path ==========
  it('converts markdown image with relative path to full OSS URL', () => {
    const input = '![alt text](/images/test.jpg)'
    const result = renderHtml(input, OSS_BASE)
    expect(result).toBe(`<img src="${OSS_BASE}/images/test.jpg" alt="alt text">`)
  })

  it('preserves absolute HTTPS URLs in markdown images', () => {
    const input = '![alt text](https://example.com/image.png)'
    const result = renderHtml(input, OSS_BASE)
    expect(result).toBe('<img src="https://example.com/image.png" alt="alt text">')
  })

  it('converts relative src in img tags to full OSS URL', () => {
    const input = '<img src="/photos/avatar.jpg">'
    const result = renderHtml(input, OSS_BASE)
    expect(result).toBe(`<img src="${OSS_BASE}/photos/avatar.jpg">`)
  })

  it('preserves absolute URLs in img tags', () => {
    const input = '<img src="https://cdn.example.com/photo.jpg">'
    const result = renderHtml(input, OSS_BASE)
    expect(result).toBe('<img src="https://cdn.example.com/photo.jpg">')
  })

  it('converts newlines to br tags', () => {
    const input = 'line1\nline2\nline3'
    const result = renderHtml(input, OSS_BASE)
    expect(result).toBe('line1<br>line2<br>line3')
  })

  // ========== Edge Cases ==========
  it('returns empty string for empty input', () => {
    expect(renderHtml('', OSS_BASE)).toBe('')
  })

  it('returns empty string for null/undefined', () => {
    expect(renderHtml(null as any, OSS_BASE)).toBe('')
    expect(renderHtml(undefined as any, OSS_BASE)).toBe('')
  })

  it('handles content with no images or newlines', () => {
    const input = 'Just plain text'
    const result = renderHtml(input, OSS_BASE)
    expect(result).toBe('Just plain text')
  })

  it('handles multiple images in same content', () => {
    const input = '![img1](/a.jpg)\n![img2](/b.jpg)'
    const result = renderHtml(input, OSS_BASE)
    expect(result).toBe(`<img src="${OSS_BASE}/a.jpg" alt="img1"><br><img src="${OSS_BASE}/b.jpg" alt="img2">`)
  })

  it('handles mixed markdown and HTML images', () => {
    const input = '![md](/md.jpg)\n<img src="/html.jpg">'
    const result = renderHtml(input, OSS_BASE)
    expect(result).toBe(`<img src="${OSS_BASE}/md.jpg" alt="md"><br><img src="${OSS_BASE}/html.jpg">`)
  })

  it('handles img tag with other attributes', () => {
    const input = '<img class="photo" src="/test.jpg" width="100">'
    const result = renderHtml(input, OSS_BASE)
    expect(result).toBe(`<img class="photo" src="${OSS_BASE}/test.jpg" width="100">`)
  })

  // ========== Custom Base URL ==========
  it('uses custom base URL when provided', () => {
    const customBase = 'https://custom-cdn.example.com'
    const input = '![img](/test.jpg)'
    const result = renderHtml(input, customBase)
    expect(result).toBe(`<img src="${customBase}/test.jpg" alt="img">`)
  })

  // ========== Special Characters ==========
  it('handles Chinese characters in alt text', () => {
    const input = '![中文图片](/test.jpg)'
    const result = renderHtml(input, OSS_BASE)
    expect(result).toBe(`<img src="${OSS_BASE}/test.jpg" alt="中文图片">`)
  })

  it('handles empty alt text', () => {
    const input = '![](/test.jpg)'
    const result = renderHtml(input, OSS_BASE)
    expect(result).toBe(`<img src="${OSS_BASE}/test.jpg" alt="">`)
  })
})

describe('renderContent', () => {
  it('uses default OSS base URL', () => {
    const input = '![img](/test.jpg)'
    const result = renderContent(input)
    expect(result).toBe(`<img src="${OSS_BASE}/test.jpg" alt="img">`)
  })

  it('converts newlines to br', () => {
    const input = 'line1\nline2'
    const result = renderContent(input)
    expect(result).toBe('line1<br>line2')
  })

  it('returns empty string for empty input', () => {
    expect(renderContent('')).toBe('')
  })
})
