'use client';

import { useEffect } from 'react';

export function useSessionEnd(sessionId: string | null) {
  useEffect(() => {
    if (!sessionId) return;

    const sendEnd = () => {
      const body = new Blob([
        JSON.stringify({ session_id: sessionId, reason: 'tab_close' })
      ], { type: 'application/json' });
      navigator.sendBeacon('/api/sessions/end', body);
    };

    window.addEventListener('beforeunload', sendEnd);
    return () => window.removeEventListener('beforeunload', sendEnd);
  }, [sessionId]);
}
