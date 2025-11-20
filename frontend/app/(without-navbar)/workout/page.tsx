"use client";

import { useRef, useState, Suspense } from "react";
import { useRouter } from "next/navigation";
import { usePoseStore, useVideoStore, useWebcamStore } from "@/store";
import { calculateSimilarity } from "@/lib/mediapipe/angle-calculator";
import { calculateContainerWidths } from "@/lib/workout/utils";
import {
  useVideoControls,
  useWorkoutExit,
  useScreenShareMonitor,
  useVideoSync,
  useWebcamLifecycle,
  useWebcamVideoElement,
  useWorkoutInitialization,
  useScreenShareGuard,
  useVideoCleanup,
} from "@/hooks/workout";
import { TimelineClipper, TimelineClipperRef } from "@/components/timeline";
import { VideoSection } from "@/components/video";
import { WebcamSection } from "@/components/webcam";
import {
  ExitConfirmModal,
  SimilarityDisplay,
  WorkoutHeader,
  WorkoutSettingsModal,
  PerformanceMonitor,
} from "@/components/workout";

function WorkoutContent() {
  const router = useRouter();
  const { webcam, video } = usePoseStore();
  const { source, sourceType, isPlaying, currentTime, duration } =
    useVideoStore();

  const videoRef = useRef<HTMLVideoElement>(null);
  const webcamVideoRef = useRef<HTMLVideoElement | null>(null);
  const timelineClipperRef = useRef<TimelineClipperRef>(null);
  const webcamStream = useWebcamStore((state) => state.stream);

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settings, setSettings] = useState({
    hideVideo: false,
    hideWebcam: false,
    videoSize: 50,
  });

  const isScreenShare = sourceType === "stream";

  const { isSetupComplete: isReady } = useWorkoutInitialization(source);

  const { isWebcamActive } = useWebcamLifecycle(isReady);
  useVideoCleanup(videoRef);
  useScreenShareGuard(isScreenShare);

  const {
    isSubmitting,
    isExitModalOpen,
    handleExit,
    handleCancelExit,
    handleConfirmExit,
  } = useWorkoutExit(timelineClipperRef);

  useScreenShareMonitor(isScreenShare, source, () => {
    setTimeout(() => router.back(), 500);
  });

  useVideoSync(videoRef, sourceType, isReady);
  useWebcamVideoElement(webcamVideoRef, webcamStream, isWebcamActive);

  const { handleTogglePlay, handleSeek } = useVideoControls(videoRef);

  const P1 = webcam.vectorized;
  const P2 = video.vectorized;
  const similarityValue = calculateSimilarity(P1, P2);

  const { videoContainerWidth, webcamContainerWidth } =
    calculateContainerWidths(settings);

  return (
    <div className='flex flex-col h-screen bg-black text-white'>
      {/* <ModelLoadingOverlay /> */}

      <WorkoutHeader
        isReady={isReady}
        onSettingsClick={() => setIsSettingsOpen(true)}
        onExitClick={handleExit}
      />

      <main className='flex flex-1 overflow-hidden'>
        <VideoSection
          videoRef={videoRef}
          isScreenShare={isScreenShare}
          isPlaying={isPlaying}
          currentTime={currentTime}
          duration={duration}
          onTogglePlay={handleTogglePlay}
          onSeek={handleSeek}
          containerWidth={videoContainerWidth}
          isHidden={settings.hideVideo}
        />

        <WebcamSection
          webcamVideoRef={webcamVideoRef}
          isWebcamActive={isWebcamActive}
          containerWidth={webcamContainerWidth}
          isHidden={settings.hideWebcam}
        />
      </main>

      <PerformanceMonitor />

      <TimelineClipper ref={timelineClipperRef} />

      <SimilarityDisplay similarityValue={similarityValue} />

      <WorkoutSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSettingsChange={setSettings}
      />

      <ExitConfirmModal
        isOpen={isExitModalOpen}
        onClose={handleCancelExit}
        onConfirm={handleConfirmExit}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}

export default function WorkoutPage() {
  return (
    <Suspense
      fallback={
        <div className='flex items-center justify-center min-h-screen bg-black'>
          <div className='p-8 text-center bg-gray-900 rounded-lg shadow-lg border border-white/10'>
            <div className='w-10 h-10 mx-auto mb-4 border-4 border-blue-400 rounded-full border-t-transparent animate-spin'></div>
            <p className='text-gray-300'>페이지를 불러오는 중...</p>
          </div>
        </div>
      }
    >
      <WorkoutContent />
    </Suspense>
  );
}
