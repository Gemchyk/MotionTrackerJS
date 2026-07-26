import { useEffect, useRef } from 'react';
import { FRAME_INTERVAL_MS } from '../config';
import { detectObjects, isAbortError } from '../services/detectionApi';
import { createFrameCapturer } from '../services/frameCapture';
import type { DetectedObject } from '../types';

interface UseDetectionLoopOptions {
  enabled: boolean;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  onDetections: (objects: DetectedObject[]) => void;
}

/**
 * Runs capture -> detect -> render as a strictly sequential loop: the next
 * frame is only scheduled after the previous response resolves, so a slow
 * backend throttles the loop instead of accumulating in-flight requests.
 */
export const useDetectionLoop = ({
  enabled,
  videoRef,
  onDetections,
}: UseDetectionLoopOptions): void => {
  // Held in a ref so a new callback identity does not restart the loop.
  const onDetectionsRef = useRef(onDetections);
  useEffect(() => {
    onDetectionsRef.current = onDetections;
  }, [onDetections]);

  useEffect(() => {
    if (!enabled) return;

    const controller = new AbortController();
    const captureFrame = createFrameCapturer();
    let cancelled = false;
    let timer: number | undefined;

    const scheduleNext = () => {
      if (cancelled) return;
      timer = window.setTimeout(tick, FRAME_INTERVAL_MS);
    };

    const tick = async () => {
      if (cancelled) return;

      const video = videoRef.current;
      const frame = video ? captureFrame(video) : null;

      if (!frame) {
        scheduleNext();
        return;
      }

      try {
        const data = await detectObjects(frame, controller.signal);
        if (!cancelled && data.success) {
          onDetectionsRef.current(data.objects);
        }
      } catch (error) {
        if (!isAbortError(error)) {
          console.error('Detection request failed:', error);
        }
      }

      scheduleNext();
    };

    void tick();

    return () => {
      cancelled = true;
      controller.abort();
      if (timer !== undefined) clearTimeout(timer);
    };
  }, [enabled, videoRef]);
};
