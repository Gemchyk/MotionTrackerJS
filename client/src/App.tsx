import { useCallback, useEffect, useRef, useState } from 'react';
import './App.css';
import { InfoModal } from './components/InfoModal';
import { VideoStage } from './components/VideoStage';
import { useCamera } from './hooks/useCamera';
import { useDetectionLoop } from './hooks/useDetectionLoop';
import { useServerStatus } from './hooks/useServerStatus';
import { clearCanvas, drawDetections } from './services/canvasRenderer';
import { serverStatusLabel, type DetectedObject } from './types';

const App = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const serverStatus = useServerStatus();
  const { videoRef, isCameraOn, cameraError, toggleCamera } = useCamera();

  const isTracking = serverStatus.kind === 'ready';

  const handleDetections = useCallback((objects: DetectedObject[]) => {
    drawDetections(canvasRef.current, objects);
  }, []);

  useDetectionLoop({
    enabled: isCameraOn && isTracking,
    videoRef,
    onDetections: handleDetections,
  });

  // Stale boxes would otherwise linger over a black stage.
  useEffect(() => {
    if (!isCameraOn) clearCanvas(canvasRef.current);
  }, [isCameraOn]);

  const closeModal = useCallback(() => setIsModalOpen(false), []);

  return (
    <div className="app">
      <header className="app-header">
        <h1>AI Object Tracker</h1>
        <button
          type="button"
          className="button button-icon"
          onClick={() => setIsModalOpen(true)}
          title="App instructions"
          aria-label="App instructions"
        >
          i
        </button>
      </header>

      <p className="status" role="status">
        Status:{' '}
        <strong className={isTracking ? 'status-online' : 'status-pending'}>
          {cameraError ?? serverStatusLabel(serverStatus)}
        </strong>
      </p>

      <VideoStage videoRef={videoRef} canvasRef={canvasRef} />

      <button
        type="button"
        className={`button ${isCameraOn ? 'button-danger' : 'button-success'}`}
        onClick={toggleCamera}
      >
        {isCameraOn ? 'Turn Off Camera' : 'Turn On Camera'}
      </button>

      {isModalOpen && <InfoModal onClose={closeModal} />}
    </div>
  );
};

export default App;
