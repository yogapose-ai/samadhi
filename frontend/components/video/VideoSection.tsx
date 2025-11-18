import { PoseLandmarker } from "@mediapipe/tasks-vision";
import { VideoCanvas, VideoControls } from "@/components/video";

interface VideoSectionProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  isInitialized: boolean;
  landmarker: PoseLandmarker | null;
  isScreenShare: boolean;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  onTogglePlay: () => void;
  onSeek: (time: number) => void;
  containerWidth: string;
  isHidden: boolean;
}

export function VideoSection({
  videoRef,
  isInitialized,
  landmarker,
  isScreenShare,
  isPlaying,
  currentTime,
  duration,
  onTogglePlay,
  onSeek,
  containerWidth,
  isHidden,
}: VideoSectionProps) {
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
        <VideoCanvas
          videoRef={videoRef}
          isInitialized={isInitialized}
          landmarker={landmarker}
        />
        {!isScreenShare && (
          <div className='p-2 bg-black/50 rounded-b-lg'>
            <VideoControls
              isPlaying={isPlaying}
              currentTime={currentTime}
              duration={duration}
              onTogglePlay={onTogglePlay}
              onSeek={onSeek}
            />
          </div>
        )}
      </div>
    </div>
  );
}
