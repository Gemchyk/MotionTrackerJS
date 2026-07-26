import { VIDEO_HEIGHT, VIDEO_WIDTH } from '../config';

interface VideoStageProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
}

/** Webcam preview with the detection overlay stacked on top. */
export const VideoStage = ({ videoRef, canvasRef }: VideoStageProps) => (
  <div
    className="video-stage"
    style={{ width: VIDEO_WIDTH, height: VIDEO_HEIGHT }}
  >
    <video
      ref={videoRef}
      autoPlay
      muted
      playsInline
      width={VIDEO_WIDTH}
      height={VIDEO_HEIGHT}
      className="video-stage-layer video-stage-video"
    />
    <canvas
      ref={canvasRef}
      width={VIDEO_WIDTH}
      height={VIDEO_HEIGHT}
      className="video-stage-layer video-stage-overlay"
    />
  </div>
);
