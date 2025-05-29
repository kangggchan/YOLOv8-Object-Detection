import React, { useState, useRef, useEffect } from 'react';
import './App.css';

function App() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [detections, setDetections] = useState([]);
  const [currentCamera, setCurrentCamera] = useState('user'); // 'user' for front, 'environment' for back
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastDetectionTime, setLastDetectionTime] = useState(null);
  const [error, setError] = useState(null);
  const [videoSize, setVideoSize] = useState({ width: 0, height: 0 });

  // Start camera stream
  const startCamera = async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: currentCamera,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          const video = videoRef.current;
          setVideoSize({
            width: video.videoWidth,
            height: video.videoHeight
          });
        };
        setIsStreaming(true);
      }
    } catch (err) {
      setError('카메라 접근 권한이 필요합니다.');
      console.error('Camera access error:', err);
    }
  };

  // Stop camera stream
  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
      setIsStreaming(false);
    }
  };

  // Switch camera
  const switchCamera = () => {
    stopCamera();
    setCurrentCamera(prev => prev === 'user' ? 'environment' : 'user');
  };

  // Capture image and send for detection
  const captureAndDetect = async () => {
    if (!videoRef.current || !canvasRef.current || isProcessing) return;

    setIsProcessing(true);
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    // Set canvas size to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw current video frame to canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert to base64
    const imageData = canvas.toDataURL('image/jpeg', 0.8);

    try {
      const response = await fetch('/api/detect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ image: imageData })
      });

      if (response.ok) {
        const result = await response.json();
        setDetections(result.detections || []);
        setLastDetectionTime(new Date().toLocaleTimeString());
        setError(null);
      } else {
        throw new Error('Detection failed');
      }
    } catch (err) {
      setError('객체 인식 중 오류가 발생했습니다.');
      console.error('Detection error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  // Auto-detect every 10 seconds
  useEffect(() => {
    if (!isStreaming) return;

    const interval = setInterval(() => {
      captureAndDetect();
    }, 10000);

    return () => clearInterval(interval);
  }, [isStreaming]);

  // Start camera when component mounts or camera changes
  useEffect(() => {
    if (!isStreaming) {
      startCamera();
    }
    return () => stopCamera();
  }, [currentCamera]);

  // Render bounding boxes
  const renderBoundingBoxes = () => {
    if (!detections.length || !videoSize.width || !videoSize.height) return null;

    const videoElement = videoRef.current;
    if (!videoElement) return null;

    const displayWidth = videoElement.offsetWidth;
    const displayHeight = videoElement.offsetHeight;

    return detections.map((detection, index) => {
      const { bbox, class: className, confidence } = detection;
      
      // Scale bounding box to display size
      const x1 = bbox.x1 * displayWidth;
      const y1 = bbox.y1 * displayHeight;
      const width = (bbox.x2 - bbox.x1) * displayWidth;
      const height = (bbox.y2 - bbox.y1) * displayHeight;

      return (
        <div
          key={index}
          className="bounding-box"
          style={{
            left: `${x1}px`,
            top: `${y1}px`,
            width: `${width}px`,
            height: `${height}px`
          }}
        >
          <div className="detection-label">
            {className} ({Math.round(confidence * 100)}%)
          </div>
        </div>
      );
    });
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>🔍 YOLOv8 Object Detection</h1>
        <p>Real-time object detection using your camera</p>
      </header>

      <main className="main-content">
        {error && (
          <div className="error-message">
            ⚠️ {error}
          </div>
        )}

        <div className="camera-container">
          <div className="video-wrapper">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="video-stream"
            />
            <canvas
              ref={canvasRef}
              style={{ display: 'none' }}
            />
            {renderBoundingBoxes()}
          </div>

          <div className="camera-controls">
            <button
              onClick={switchCamera}
              className="control-button camera-switch"
              disabled={!isStreaming}
            >
              📷 {currentCamera === 'user' ? '후면 카메라' : '전면 카메라'}
            </button>

            <button
              onClick={captureAndDetect}
              className="control-button detect-button"
              disabled={!isStreaming || isProcessing}
            >
              {isProcessing ? '🔄 분석 중...' : '🎯 지금 인식'}
            </button>

            <button
              onClick={isStreaming ? stopCamera : startCamera}
              className={`control-button ${isStreaming ? 'stop-button' : 'start-button'}`}
            >
              {isStreaming ? '⏹️ 정지' : '▶️ 시작'}
            </button>
          </div>
        </div>

        <div className="detection-info">
          <div className="info-header">
            <h3>🎯 Detection Results</h3>
            {lastDetectionTime && (
              <span className="last-update">
                마지막 업데이트: {lastDetectionTime}
              </span>
            )}
          </div>

          {detections.length > 0 ? (
            <div className="detections-grid">
              {detections.map((detection, index) => (
                <div key={index} className="detection-card">
                  <div className="detection-header">
                    <span className="object-name">{detection.class}</span>
                    <span className="confidence">
                      {Math.round(detection.confidence * 100)}%
                    </span>
                  </div>
                  <div className="detection-details">
                    <small>
                      위치: ({Math.round(detection.bbox.x1 * 100)}%, {Math.round(detection.bbox.y1 * 100)}%) 
                      ~ ({Math.round(detection.bbox.x2 * 100)}%, {Math.round(detection.bbox.y2 * 100)}%)
                    </small>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="no-detections">
              {isProcessing ? '🔄 분석 중...' : '📷 객체가 감지되지 않았습니다'}
            </div>
          )}

          <div className="stats">
            <div className="stat-item">
              <span className="stat-label">감지된 객체:</span>
              <span className="stat-value">{detections.length}개</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">카메라:</span>
              <span className="stat-value">
                {currentCamera === 'user' ? '전면' : '후면'}
              </span>
            </div>
            <div className="stat-item">
              <span className="stat-label">상태:</span>
              <span className="stat-value">
                {isStreaming ? '🟢 활성' : '🔴 비활성'}
              </span>
            </div>
          </div>
        </div>
      </main>

      <footer className="app-footer">
        <p>💡 10초마다 자동으로 객체를 인식합니다</p>
      </footer>
    </div>
  );
}

export default App;