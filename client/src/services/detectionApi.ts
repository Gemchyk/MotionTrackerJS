import { API_BASE_URL, REQUEST_TIMEOUT_MS } from '../config';
import type { DetectResponse, StatusResponse } from '../types';

/**
 * Combines an external abort signal with a timeout, so a hung backend cannot
 * stall the detection loop forever and an unmount cancels in-flight work.
 */
const withTimeout = (signal: AbortSignal | undefined, timeoutMs: number) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const abort = () => controller.abort();
  signal?.addEventListener('abort', abort);

  const cleanup = () => {
    clearTimeout(timer);
    signal?.removeEventListener('abort', abort);
  };

  return { signal: controller.signal, cleanup };
};

export const fetchStatus = async (
  signal?: AbortSignal,
): Promise<StatusResponse> => {
  const { signal: timed, cleanup } = withTimeout(signal, REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(`${API_BASE_URL}/api/status`, {
      signal: timed,
    });
    if (!response.ok) {
      throw new Error(`Status request failed: ${response.status}`);
    }
    return (await response.json()) as StatusResponse;
  } finally {
    cleanup();
  }
};

export const detectObjects = async (
  frame: string,
  signal?: AbortSignal,
): Promise<DetectResponse> => {
  const { signal: timed, cleanup } = withTimeout(signal, REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(`${API_BASE_URL}/api/detect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ frame }),
      signal: timed,
    });
    if (!response.ok) {
      throw new Error(`Detect request failed: ${response.status}`);
    }
    return (await response.json()) as DetectResponse;
  } finally {
    cleanup();
  }
};

/** True when a rejection is just a cancelled request rather than a real error. */
export const isAbortError = (error: unknown): boolean =>
  error instanceof DOMException && error.name === 'AbortError';
