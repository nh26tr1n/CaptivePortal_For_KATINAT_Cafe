'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[app/global-error] root layout rendering failed', error);
  }, [error]);

  return (
    <html lang="vi">
      <body style={{ margin: 0, background: '#f8fafc', color: '#0f172a', fontFamily: 'Arial, sans-serif' }}>
        <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: '24px' }}>
          <section style={{ maxWidth: '480px', padding: '32px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', textAlign: 'center' }}>
            <h1 style={{ fontSize: '22px' }}>Ứng dụng gặp sự cố</h1>
            <p role="alert" style={{ color: '#475569', lineHeight: 1.6 }}>
              Không thể tải ứng dụng. Vui lòng thử lại hoặc tải lại trang.
            </p>
            <button
              onClick={reset}
              style={{ border: 0, borderRadius: '6px', padding: '10px 16px', background: '#4f46e5', color: '#fff', cursor: 'pointer' }}
              type="button"
            >
              Thử lại
            </button>
          </section>
        </main>
      </body>
    </html>
  );
}
