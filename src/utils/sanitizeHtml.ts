/**
 * Small HTML sanitizer for rich text written in the announcement editor: it removes scripts, frames, inline
 * event handlers and javascript: links, and keeps ordinary formatting (text, lists, tables, links, images).
 */
const BLOCKED_TAGS = new Set(['script', 'style', 'iframe', 'object', 'embed', 'link', 'meta', 'base', 'form']);

export const sanitizeHtml = (html: string): string => {
  if (!html || typeof DOMParser === 'undefined') return html || '';
  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, 'text/html');
  const root = doc.body.firstElementChild as HTMLElement | null;
  if (!root) return '';

  const clean = (el: Element) => {
    Array.from(el.children).forEach((child) => {
      if (BLOCKED_TAGS.has(child.tagName.toLowerCase())) {
        child.remove();
        return;
      }
      Array.from(child.attributes).forEach((attr) => {
        const name = attr.name.toLowerCase();
        const value = attr.value.trim().toLowerCase();
        if (name.startsWith('on')) child.removeAttribute(attr.name);
        else if ((name === 'href' || name === 'src') && (value.startsWith('javascript:') || value.startsWith('data:text'))) {
          child.removeAttribute(attr.name);
        }
      });
      if (child.tagName.toLowerCase() === 'a') {
        child.setAttribute('target', '_blank');
        child.setAttribute('rel', 'noopener noreferrer');
      }
      clean(child);
    });
  };
  clean(root);
  return root.innerHTML;
};

/** Plain text of an HTML string (for word counts and list previews). */
export const htmlToText = (html: string): string => {
  if (!html || typeof DOMParser === 'undefined') return html || '';
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return (doc.body.textContent || '').replace(/\s+/g, ' ').trim();
};
