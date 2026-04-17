import DOMPurify from 'dompurify';

/**
 * 清洗 HTML 字符串，移除 XSS 风险
 * 用于必须使用 dangerouslySetInnerHTML 的场景（如富文本渲染）
 *
 * 使用：
 *   import { sanitizeHTML } from '@/lib/sanitize';
 *   <div dangerouslySetInnerHTML={{ __html: sanitizeHTML(userContent) }} />
 */
export function sanitizeHTML(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    USE_PROFILES: { html: true },
    FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover'],
  });
}

/**
 * 清洗 URL，拒绝 javascript:/data: 等危险协议
 */
export function sanitizeURL(url: string): string | null {
  try {
    const parsed = new URL(url, window.location.origin);
    const allowedProtocols = ['http:', 'https:', 'mailto:', 'tel:'];
    if (!allowedProtocols.includes(parsed.protocol)) {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}