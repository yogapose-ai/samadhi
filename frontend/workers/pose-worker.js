import { FilesetResolver, PoseLandmarker } from "@mediapipe/tasks-vision";
import {
  calculateAllAngles,
  vectorize,
} from "@/lib/mediapipe/angle-calculator";
import { classifyPoseWithVectorized } from "@/lib/poseClassifier/pose-classifier-with-vectorized";

let landmarker = null;
let isInitialized = false;

const DELEGATE_ORDER = ["GPU", "CPU"];

async function initializeLandmarker() {
  const modelUrl = new URL(
    "/models/pose_landmarker_full.task",
    self.location.origin
  ).href;

  const filesetResolver = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
  );
  let finalDelegate = null;

  for (const delegate of DELEGATE_ORDER) {
    try {
      landmarker = await PoseLandmarker.createFromOptions(filesetResolver, {
        baseOptions: {
          modelAssetPath: modelUrl,
          delegate: delegate,
        },
        runningMode: "VIDEO",
      });
      finalDelegate = delegate;
      console.log(`✅ Landmarker initialized with ${delegate} delegate.`);
      break;
    } catch {
      console.warn(
        `❌ Initialization with ${delegate} failed. Trying next delegate...`
      );
    }
  }

  if (!finalDelegate) {
    console.error("🚨 Landmarker initialization failed with all delegates.");
    return;
  }

  isInitialized = true;
  postMessage({ type: "INITIALIZED", delegate: finalDelegate });
}

self.onmessage = async (event) => {
  const { type, imageBitmap, previousAngles, timestamp, lastFrameTime } =
    event.data;

  if (type === "INIT") {
    initializeLandmarker();
  } else if (type === "DETECT" && isInitialized && imageBitmap) {
    const detectStartTime = performance.now();
    const results = landmarker.detectForVideo(imageBitmap, timestamp);

    if (results.landmarks && results.landmarks.length > 0) {
      const landmarks = results.landmarks[0];
      const worldLandmarks = results.worldLandmarks?.[0];

      if (worldLandmarks) {
        const data = vectorize(
          landmarks,
          imageBitmap.height,
          imageBitmap.width
        );

        const angles = calculateAllAngles(
          worldLandmarks,
          previousAngles,
          (_) => {}
        );

        const poseClass = classifyPoseWithVectorized(data, angles);

        const latency = Math.round(performance.now() - detectStartTime);
        const fps = lastFrameTime
          ? Math.round(1000 / (timestamp - lastFrameTime))
          : 0;

        // console.log(`[WORKER] Finished detection in ${latency.toFixed(2)}ms.`);
        // console.log(`[WORKER] fps:  ${fps}`);

        postMessage({
          type: "RESULT",
          landmarks: landmarks,
          angles: angles,
          vectorized: data,
          poseClass: poseClass.bestPose,
          fps: fps,
          latency: latency,
        });
      }
    }
  }
};
