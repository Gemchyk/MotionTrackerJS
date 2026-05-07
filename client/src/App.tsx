import React, { Component, RefObject } from 'react';

interface DetectedObject {
  bbox: [number, number, number, number];
  class: string;
  score: number;
}

interface AppState {
  isTracking: boolean;
  serverStatus: string;
  isCameraOn: boolean;
}

class App extends Component<{}, AppState> {
  videoRef: RefObject<HTMLVideoElement>;
  canvasRef: RefObject<HTMLCanvasElement>;
  pollInterval: NodeJS.Timeout | null = null;
  isRunning: boolean = false;

  constructor(props: {}) {
    super(props);
    this.state = {
      isTracking: false,
      serverStatus: 'Checking server connection...',
      isCameraOn: false,
    };

    this.videoRef = React.createRef();
    this.canvasRef = React.createRef();
  }

  componentDidMount() {
    this.setupCamera();
    this.startPolling();
  }

  componentDidUpdate(prevProps: {}, prevState: AppState) {
    if (!prevState.isTracking && this.state.isTracking) {
      if (this.pollInterval) {
        clearInterval(this.pollInterval);
        this.pollInterval = null;
      }
      this.startTracking();
    }
  }

  componentWillUnmount() {
    if (this.pollInterval) clearInterval(this.pollInterval);
    this.isRunning = false;

    if (this.videoRef.current && this.videoRef.current.srcObject) {
      const stream = this.videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
    }
  }

  setupCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 },
        audio: false,
      });
      if (this.videoRef.current) {
        this.videoRef.current.srcObject = stream;
      }
      this.setState({ isCameraOn: true });
    } catch (err) {
      console.error(err);
      this.setState({ serverStatus: "Error: Webcam access denied or unavailable." });
    }
  };

  toggleCamera = () => {
    if (this.state.isCameraOn) {
      if (this.videoRef.current && this.videoRef.current.srcObject) {
        const stream = this.videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
        this.videoRef.current.srcObject = null;
      }
      if (this.canvasRef.current) {
        const ctx = this.canvasRef.current.getContext('2d');
        if (ctx) ctx.clearRect(0, 0, this.canvasRef.current.width, this.canvasRef.current.height);
      }
      this.setState({ isCameraOn: false });
    } else {
      this.setupCamera();
    }
  };

  checkServer = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/status');
      const data = await res.json();

      if (data.aiModelReady) {
        this.setState({
          serverStatus: 'Online & Tracking',
          isTracking: true,
        });
      } else {
        this.setState({ serverStatus: 'Server found. AI model is warming up...' });
      }
    } catch (err) {
      this.setState({ serverStatus: 'Server offline' });
    }
  };

  startPolling = () => {
    if (!this.state.isTracking) {
      this.pollInterval = setInterval(this.checkServer, 2000);
    }
  };

  startTracking = () => {
    this.isRunning = true;
    this.processAndSendFrame();
  };

  processAndSendFrame = async () => {
    if (!this.isRunning) return;

    if (this.state.isCameraOn && this.videoRef.current && this.canvasRef.current && this.state.isTracking) {
      const hiddenCanvas = document.createElement('canvas');
      hiddenCanvas.width = this.videoRef.current.videoWidth || 640;
      hiddenCanvas.height = this.videoRef.current.videoHeight || 480;
      const hiddenCtx = hiddenCanvas.getContext('2d');

      if (hiddenCtx) {
        hiddenCtx.drawImage(this.videoRef.current, 0, 0, hiddenCanvas.width, hiddenCanvas.height);
        const base64Frame = hiddenCanvas.toDataURL('image/jpeg', 0.8);

        try {
          const response = await fetch('http://localhost:5000/api/detect', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ frame: base64Frame }),
          });

          if (response.ok) {
            const data = await response.json();
            // TODO: Check if the camera is STILL on after the async fetch resolves
            if (data.success && this.state.isCameraOn) {
              this.drawBoundingBoxes(data.objects);
            }
          }
        } catch (error) {
          console.error(error);
        }
      }
    }

    setTimeout(() => {
      if (this.isRunning) requestAnimationFrame(this.processAndSendFrame);
    }, 50);
  };

  drawBoundingBoxes = (predictions: DetectedObject[]) => {
    const canvas = this.canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = '16px sans-serif';
    ctx.textBaseline = 'top';

    predictions.forEach((prediction) => {
      const [x, y, width, height] = prediction.bbox;

      ctx.strokeStyle = '#00FFFF';
      ctx.lineWidth = 4;
      ctx.strokeRect(x, y, width, height);

      ctx.fillStyle = '#00FFFF';
      const textWidth = ctx.measureText(prediction.class).width;
      ctx.fillRect(x, y - 24, textWidth + 10, 24);

      ctx.fillStyle = '#000000';
      ctx.fillText(`${prediction.class} (${Math.round(prediction.score * 100)}%)`, x + 4, y - 20);
    });
  };

  render() {
    const { isTracking, serverStatus, isCameraOn } = this.state;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', fontFamily: 'sans-serif', marginTop: '2rem' }}>
        <h1>AI Object Tracker</h1>
        <p>Status: <span style={{ color: isTracking ? 'green' : 'orange' }}><strong>{serverStatus}</strong></span></p>

        <div style={{ position: 'relative', width: 640, height: 480, backgroundColor: '#111', borderRadius: '8px', overflow: 'hidden' }}>
          <video
            ref={this.videoRef}
            autoPlay
            muted
            width="640"
            height="480"
            style={{ position: 'absolute', left: 0, top: 0, zIndex: 1, objectFit: 'cover' }}
          />
          <canvas
            ref={this.canvasRef}
            width="640"
            height="480"
            style={{ position: 'absolute', left: 0, top: 0, zIndex: 2 }}
          />
        </div>
        
        <button 
          onClick={this.toggleCamera}
          style={{
            marginTop: '1.5rem',
            padding: '10px 20px',
            fontSize: '16px',
            cursor: 'pointer',
            backgroundColor: isCameraOn ? '#ff4444' : '#00C851',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontWeight: 'bold'
          }}
        >
          {isCameraOn ? 'Turn Off Camera' : 'Turn On Camera'}
        </button>
      </div>
    );
  }
}

export default App;