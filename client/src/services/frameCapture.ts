import { FRAME_JPEG_QUALITY, VIDEO_HEIGHT, VIDEO_WIDTH } from '../config';

/**
 * Encodes video frames as base64 JPEG.
 *
 * The offscreen canvas is allocated once and reused; the previous version
 * created a new canvas on every frame, which churned memory at ~20 fps.
 */
export const createFrameCapturer = () => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  return (video: HTMLVideoElement): string | null => {
    if (!ctx) return null;

    const width = video.videoWidth || VIDEO_WIDTH;
    const height = video.videoHeight || VIDEO_HEIGHT;

    // Video metadata may not have loaded yet; skip until dimensions are real.
    if (width === 0 || height === 0) return null;

    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }

    ctx.drawImage(video, 0, 0, width, height);
    return canvas.toDataURL('image/jpeg', FRAME_JPEG_QUALITY);
  };
};

export type FrameCapturer = ReturnType<typeof createFrameCapturer>;
