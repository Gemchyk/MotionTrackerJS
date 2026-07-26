import { useCallback, useEffect, useRef, useState } from 'react';
import {
  CameraUnavailableError,
  closeCameraStream,
  openCameraStream,
} from '../services/cameraService';

interface UseCameraResult {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  isCameraOn: boolean;
  cameraError: string | null;
  toggleCamera: () => void;
}

/**
 * Owns the webcam stream lifecycle. The stream is tracked in a ref rather than
 * read back off the video element so it can always be stopped on unmount.
 */
export const useCamera = (): UseCameraResult => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const stopCamera = useCallback(() => {
    closeCameraStream(streamRef.current);
    streamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraOn(false);
  }, []);

  const startCamera = useCallback(async () => {
    try {
      const stream = await openCameraStream();

      // The component may have unmounted while permission was pending.
      if (!videoRef.current) {
        closeCameraStream(stream);
        return;
      }

      streamRef.current = stream;
      videoRef.current.srcObject = stream;
      setCameraError(null);
      setIsCameraOn(true);
    } catch (error) {
      const message =
        error instanceof CameraUnavailableError
          ? error.message
          : 'Could not start the camera.';
      console.error(error);
      setCameraError(message);
      setIsCameraOn(false);
    }
  }, []);

  const toggleCamera = useCallback(() => {
    if (isCameraOn) {
      stopCamera();
    } else {
      void startCamera();
    }
  }, [isCameraOn, startCamera, stopCamera]);

  useEffect(() => {
    // Requesting the camera is exactly the "synchronise with an external
    // system" case effects exist for. startCamera awaits before touching
    // state, so no update happens synchronously here despite the rule below.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void startCamera();
    return () => {
      closeCameraStream(streamRef.current);
      streamRef.current = null;
    };
  }, [startCamera]);

  return { videoRef, isCameraOn, cameraError, toggleCamera };
};
