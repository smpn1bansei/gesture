import { FilesetResolver, HandLandmarker } from 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.21/vision_bundle.mjs';

const WASM_ROOT = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.21/wasm';
const MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';
let detector;

self.onmessage = async ({ data }) => {
  try {
    if (data.type === 'init') {
      const vision = await FilesetResolver.forVisionTasks(WASM_ROOT);
      detector = await HandLandmarker.createFromOptions(vision, {
        baseOptions: { modelAssetPath: MODEL_URL },
        runningMode: 'VIDEO',
        numHands: 2,
        minHandDetectionConfidence: 0.55,
        minHandPresenceConfidence: 0.55,
        minTrackingConfidence: 0.65
      });
      self.postMessage({ type: 'ready' });
      return;
    }

    if (data.type === 'frame' && detector) {
      const result = detector.detectForVideo(data.frame, data.timestamp);
      data.frame.close();
      self.postMessage({ type: 'result', landmarks: result.landmarks || [] });
    }
  } catch (error) {
    if (data.frame) data.frame.close();
    self.postMessage({ type: 'error', message: error.message || 'Pelacakan tangan gagal dimuat.' });
  }
};
