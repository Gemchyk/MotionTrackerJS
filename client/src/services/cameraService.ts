import { VIDEO_HEIGHT, VIDEO_WIDTH } from '../config';

export class CameraUnavailableError extends Error {
  constructor(cause: unknown) {
    super('Webcam access denied or unavailable.');
    this.name = 'CameraUnavailableError';
    this.cause = cause;
  }
}

export const openCameraStream = async (): Promise<MediaStream> => {
  try {
    return await navigator.mediaDevices.getUserMedia({
      video: { width: VIDEO_WIDTH, height: VIDEO_HEIGHT },
      audio: false,
    });
  } catch (error) {
    throw new CameraUnavailableError(error);
  }
};

/** Stops every track so the browser releases the camera and its indicator. */
export const closeCameraStream = (stream: MediaStream | null): void => {
  stream?.getTracks().forEach((track) => track.stop());
};
