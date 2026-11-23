export function normalizeEmailHtml(value: string) {
  const content = value.trim();
  if (/<\/?[a-z][^>]*>/i.test(content)) return content;

  const escaped = content
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/\r\n?|\n/g, '<br>');

  return `<p>${escaped}</p>`;
}
