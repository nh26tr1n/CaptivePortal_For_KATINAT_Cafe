import 'server-only';

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[character] ?? character);
}

export function renderCampaignTemplate({ content, name, unsubscribeUrl, cafeName, address, unsubscribeLabel, locale, voucherCode }: {
  content: string;
  name: string | null;
  unsubscribeUrl: string;
  cafeName: string;
  address: string;
  unsubscribeLabel: string;
  locale: string;
  voucherCode?: string | null;
}) {
  const safeName = escapeHtml(name?.trim() || '');
  const safeVoucherCode = escapeHtml(voucherCode ?? '');
  const personalizedContent = content
    .replace(/\{\{\s*name\s*\}\}/g, safeName)
    .replace(/\{\{\s*voucher_code\s*\}\}/g, safeVoucherCode);
  const safeUnsubscribeUrl = escapeHtml(unsubscribeUrl);

  return `<!doctype html>
<html lang="${locale === 'en' ? 'en' : 'vi'}">
  <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
  <body style="margin:0;background:#f6f3ef;color:#29231f;font-family:Arial,sans-serif">
    <div style="max-width:640px;margin:24px auto;background:#ffffff;border-radius:12px;overflow:hidden">
      <header style="padding:24px;background:#5b3025;color:#ffffff;font-size:22px;font-weight:700">${escapeHtml(cafeName)}</header>
      <main style="padding:28px 24px">${personalizedContent}</main>
      <footer style="padding:20px 24px;background:#f6f3ef;color:#625a55;font-size:12px;line-height:1.6">
        <p>${escapeHtml(cafeName)} · ${escapeHtml(address)}</p>
        <p><a href="${safeUnsubscribeUrl}" style="color:#5b3025">${escapeHtml(unsubscribeLabel)}</a></p>
      </footer>
    </div>
  </body>
</html>`;
}
