'use client';

import { useEffect } from 'react';

export default function AppError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[app/error] route rendering failed', error);
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6 text-slate-900">
      <section className="w-full max-w-lg space-y-4 rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-xl font-semibold">Không thể tải trang</h1>
        <p role="alert" className="text-sm text-slate-600">
          Đã có lỗi xảy ra khi tải dữ liệu. Vui lòng thử lại.
        </p>
        <div className="flex justify-center gap-3">
          <button
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            onClick={reset}
            type="button"
          >
            Thử lại
          </button>
          <a
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            href="/portal"
          >
            Về Portal
          </a>
        </div>
      </section>
    </main>
  );
}
