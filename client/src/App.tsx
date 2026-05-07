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
  isModalOpen: boolean; // Added modal state
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
      isModalOpen: false, // Initialize modal as closed
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

  // Toggles the modal open and closed
  toggleModal = () => {
    this.setState((prevState) => ({ isModalOpen: !prevState.isModalOpen }));
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
            // Include the previous fix: verify camera is still on before drawing
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
    const { isTracking, serverStatus, isCameraOn, isModalOpen } = this.state;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', fontFamily: 'sans-serif', marginTop: '2rem' }}>
        
        {/* Header container for Title and Info Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <h1 style={{ margin: 0 }}>AI Object Tracker</h1>
          <button 
            onClick={this.toggleModal}
            style={{
              padding: '5px 14px',
              fontSize: '18px',
              cursor: 'pointer',
              backgroundColor: '#007BFF',
              color: 'white',
              border: 'none',
              borderRadius: '50px',
              fontWeight: 'bold',
              height: '40px',
              width: '40px',
              marginTop: '15px'
            }}
            title="App Instructions"
          >
            i
          </button>
        </div>

        <p style={{margin: "30px"}}>Status: <span style={{ color: isTracking ? 'green' : 'orange'}}><strong>{serverStatus}</strong></span></p>

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

        {/* Modal Overlay */}
        {isModalOpen && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            zIndex: 9999,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center'
          }}>
            {/* Modal Content */}
            <div style={{
              backgroundColor: '#222', 
              color: '#eaeaea',        
              padding: '2rem',
              borderRadius: '8px',
              maxWidth: '500px',
              width: '90%',
              position: 'relative',
              boxShadow: '0 4px 6px rgba(0,0,0,0.4)' 
            }}>
              <button
                onClick={this.toggleModal}
                style={{
                  position: 'absolute',
                  top: '15px',
                  right: '20px',
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#666'
                }}
              >
                &times;
              </button>
              
              <h2 style={{ marginTop: 0, color: '#ffffff' }}>About AI Object Tracker</h2>
              <p style={{ lineHeight: '1.5' }}>
                This application streams your webcam feed to a local backend server where a 
                <strong> COCO-SSD machine learning model</strong> analyzes the frames to detect common objects in real-time.
              </p>
              
              <h3 style={{ marginTop: '1.5rem', color: '#ffffff' }}>How to use:</h3>
              <ol style={{ lineHeight: '1.6', paddingLeft: '20px' }}>
                <li>Ensure your backend Express server (Port 5000) is running.</li>
                <li>Wait for the server status to read <strong>"Online & Tracking"</strong>.</li>
                <li>Click <strong>Turn On Camera</strong> and allow browser permissions.</li>
                <li>Point your camera at everyday objects (e.g., cell phone, cup, person) to see the AI detect them.</li>
              </ol>

              <div style={{ marginTop: '2rem', textAlign: 'right' }}>
                <button 
                  onClick={this.toggleModal}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#007BFF',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontWeight: 'bold'
                  }}
                >
                  Got it!
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }
}

export default App;