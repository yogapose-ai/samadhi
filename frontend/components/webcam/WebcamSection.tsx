import { PoseLandmarker } from "@mediapipe/tasks-vision";
import { WebcamCanvas } from "@/components/webcam";

interface WebcamSectionProps {
  webcamVideoRef: React.RefObject<HTMLVideoElement | null>;
  isWebcamActive: boolean;
  isInitialized: boolean;
  landmarker: PoseLandmarker | null;
  containerWidth: string;
  isHidden: boolean;
}

export function WebcamSection({
  webcamVideoRef,
  isWebcamActive,
  isInitialized,
  landmarker,
  containerWidth,
  isHidden,
}: WebcamSectionProps) {
  return (
    <div
      className='transition-all duration-300 flex items-start justify-center bg-black h-full pt-8'
      style={{
        width: containerWidth,
        padding: isHidden ? "0" : "1rem",
        overflow: "hidden",
      }}
    >
      <div className='w-full max-w-full'>
        <WebcamCanvas
          videoRef={webcamVideoRef}
          isActive={isWebcamActive}
          isInitialized={isInitialized}
          landmarker={landmarker}
        />
      </div>
    </div>
  );
}
