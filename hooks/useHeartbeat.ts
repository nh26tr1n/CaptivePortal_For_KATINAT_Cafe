'use client';

import { useEffect } from 'react';

export function useHeartbeat(sessionId: string | null, intervalMs = 60_000) {
  useEffect(() => {
    if (!sessionId) return;

    let timer: number | null = null;
    const stop = () => {
      if (timer !== null) {
        window.clearInterval(timer);
        timer = null;
      }
    };
    const heartbeat = () => {
      void fetch('/api/sessions/heartbeat', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId }),
        keepalive: true
      }).catch(() => undefined);
    };
    const start = () => {
      if (document.visibilityState !== 'visible' || timer !== null) return;
      heartbeat();
      timer = window.setInterval(heartbeat, intervalMs);
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        stop();
      } else {
        start();
      }
    };

    start();
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      stop();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [intervalMs, sessionId]);
}
