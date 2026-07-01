/**
 * 渲染 HTML 内容（兼容旧的 Markdown 图片语法）
 * 支持：
 * - ![alt](/path) → 补全为完整 OSS URL
 * - ![alt](https://...) → 直接使用
 * - <img src="/path"> → 补全为完整 OSS URL
 * - 换行符 → <br>
 */
const OSS_BASE = 'https://rh-wh.oss-cn-shanghai.aliyuncs.com'

export function renderHtml(content: string, base: string = OSS_BASE): string {
  if (!content) return ''
  let html = content.replace(/!\[([^\]]*)\]\((\/[^)]+)\)/g, `<img src="${base}$2" alt="$1">`)
  html = html.replace(/!\[([^\]]*)\]\((https?:\/\/[^)]+)\)/g, `<img src="$2" alt="$1">`)
  html = html.replace(/<img([^>]*?)src="(\/[^"]*?)"/g, `<img$1src="${base}$2"`)
  html = html.replace(/\n/g, '<br>')
  return html
}

export function renderContent(content: string): string {
  return renderHtml(content, OSS_BASE)
}
