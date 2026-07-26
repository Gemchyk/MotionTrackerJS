import { useEffect, useState } from 'react';
import { STATUS_POLL_INTERVAL_MS } from '../config';
import { fetchStatus, isAbortError } from '../services/detectionApi';
import type { ServerStatus } from '../types';

/**
 * Polls the backend until the model reports ready, then stops polling.
 * All requests are aborted on unmount so no state update lands after teardown.
 */
export const useServerStatus = (): ServerStatus => {
  const [status, setStatus] = useState<ServerStatus>({ kind: 'connecting' });
  const isReady = status.kind === 'ready';

  useEffect(() => {
    if (isReady) return;

    const controller = new AbortController();
    let timer: number | undefined;
    let cancelled = false;

    const poll = async () => {
      try {
        const data = await fetchStatus(controller.signal);
        if (cancelled) return;
        setStatus(data.aiModelReady ? { kind: 'ready' } : { kind: 'warming-up' });
      } catch (error) {
        if (cancelled || isAbortError(error)) return;
        setStatus({ kind: 'offline' });
      }

      if (!cancelled) {
        timer = window.setTimeout(poll, STATUS_POLL_INTERVAL_MS);
      }
    };

    void poll();

    return () => {
      cancelled = true;
      controller.abort();
      if (timer !== undefined) clearTimeout(timer);
    };
  }, [isReady]);

  return status;
};
