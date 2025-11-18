"use client";

import { useRef, useEffect, useState, Suspense } from "react";
import { useRouter } from "next/navigation";
import { usePoseStore, useVideoStore, useWebcamStore } from "@/store";
import { toast } from "sonner";
import { calculateSimilarity } from "@/lib/mediapipe/angle-calculator";
import { calculateContainerWidths } from "@/lib/workout/utils";
import { useMediaPipe } from "@/hooks/useMediaPipe";
import { useWorkoutExit } from "@/hooks/uswWorkoutExit";
import { TimelineClipper, TimelineClipperRef } from "@/components/timeline";
import { VideoSection } from "@/components/video";
import { WebcamSection } from "@/components/webcam";
import {
  ExitConfirmModal,
  ModelLoadingOverlay,
  PerformanceMonitor,
  SimilarityDisplay,
  WorkoutHeader,
  WorkoutSettingsModal,
} from "@/components/workout";

function useWebcamLifecycle(isReady: boolean) {
  const startWebcam = useWebcamStore((state) => state.startWebcam);
  const stopWebcam = useWebcamStore((state) => state.stopWebcam);
  const isWebcamActive = useWebcamStore((state) => state.isActive);

  useEffect(() => {
    // 모델이 완전히 로드된 후에만 웹캠 시작
    if (isReady) {
      // console.log("✅ 모델 로딩 완료, 웹캠 시작");
      startWebcam();
      return () => {
        stopWebcam();
      };
    }
  }, [isReady, startWebcam, stopWebcam]);

  return { isWebcamActive };
}

function useScreenShareMonitor(
  isScreenShare: boolean,
  source: string | MediaStream | null,
  onScreenShareEnd: () => void
) {
  useEffect(() => {
    if (!isScreenShare || !source) return;

    const stream = source as MediaStream;
    const videoTrack = stream.getVideoTracks()[0];

    if (!videoTrack) {
      return;
    }

    const handleEnded = () => {
      toast.error("화면 공유가 종료되었습니다.");
      onScreenShareEnd();
    };

    videoTrack.addEventListener("ended", handleEnded);

    return () => {
      videoTrack.removeEventListener("ended", handleEnded);
    };
  }, [isScreenShare, source, onScreenShareEnd]);
}

function useVideoSync(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  sourceType: string,
  isReady: boolean
) {
  const { setPlaying, setCurrentTime, setDuration } = useVideoStore();

  useEffect(() => {
    const video = videoRef?.current;
    if (!video || sourceType !== "url" || !isReady) return;

    const handlePlay = () => setPlaying(true);
    const handlePause = () => setPlaying(false);
    const handleTimeUpdate = () => setCurrentTime(video.currentTime);
    const handleDurationChange = () => setDuration(video.duration);

    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);
    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("durationchange", handleDurationChange);

    setPlaying(!video.paused);
    if (video.duration) setDuration(video.duration);

    return () => {
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePause);
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("durationchange", handleDurationChange);
    };
  }, [sourceType, isReady, setPlaying, setCurrentTime, setDuration, videoRef]);
}

function useWebcamVideoElement(
  webcamVideoRef: React.RefObject<HTMLVideoElement | null>,
  webcamStream: MediaStream | null,
  isWebcamActive: boolean
) {
  useEffect(() => {
    if (!webcamStream || !isWebcamActive) {
      return;
    }

    let mounted = true;
    let retryTimeout: NodeJS.Timeout | null = null;

    const setupVideo = async (retry = 0) => {
      if (!mounted) return;

      const video = webcamVideoRef.current;

      if (!video) {
        if (retry < 10) {
          retryTimeout = setTimeout(() => setupVideo(retry + 1), 100);
        } else {
          console.error("웹캠 비디오 엘리먼트를 찾을 수 없습니다.");
        }
        return;
      }

      try {
        // 이전 스트림 정리
        if (video.srcObject && video.srcObject !== webcamStream) {
          const oldStream = video.srcObject as MediaStream;
          oldStream.getTracks().forEach((track) => track.stop());
          video.srcObject = null;
        }

        // 새 스트림 설정
        if (video.srcObject !== webcamStream) {
          video.srcObject = webcamStream;

          // 메타데이터 로드 대기
          await new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(
              () => reject(new Error("Metadata timeout")),
              5000
            );
            video.onloadedmetadata = () => {
              clearTimeout(timeout);
              resolve();
            };
            video.onerror = () => {
              clearTimeout(timeout);
              reject(new Error("Video load error"));
            };
          });
        }

        // 재생
        if (video.paused) {
          await video.play();
        }

        // console.log(`웹캠 비디오 재생 성공 (시도 ${retry + 1})`);
      } catch {
        // console.warn(`웹캠 설정 실패 (시도 ${retry + 1}):`, error);

        if (retry < 10 && mounted) {
          retryTimeout = setTimeout(() => setupVideo(retry + 1), 300);
        } else {
          // console.error("웹캠 설정 최종 실패:", error);
          toast.error("웹캠 연결에 실패했습니다. 페이지를 새로고침해주세요.");
        }
      }
    };

    setupVideo();

    return () => {
      mounted = false;
      if (retryTimeout) clearTimeout(retryTimeout);

      const video = webcamVideoRef.current;
      if (video) {
        video.pause();
        if (video.srcObject) {
          const stream = video.srcObject as MediaStream;
          stream.getTracks().forEach((track) => track.stop());
          video.srcObject = null;
        }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [webcamStream, isWebcamActive, webcamVideoRef]);
}

function WorkoutContent() {
  const router = useRouter();
  const { videoLandmarker, webcamLandmarker, isInitialized } = useMediaPipe();
  const { webcam, video } = usePoseStore();
  const {
    source,
    sourceType,
    isPlaying,
    currentTime,
    duration,
    setCurrentTime,
  } = useVideoStore();

  const videoRef = useRef<HTMLVideoElement>(null);
  const webcamVideoRef = useRef<HTMLVideoElement | null>(null);
  const timelineClipperRef = useRef<TimelineClipperRef>(null);
  const webcamStream = useWebcamStore((state) => state.stream);
  const [isSetupComplete, setIsSetupComplete] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settings, setSettings] = useState({
    hideVideo: false,
    hideWebcam: false,
    videoSize: 50,
  });

  const isScreenShare = sourceType === "stream";
  const isReady = isSetupComplete && isInitialized;

  const { isWebcamActive } = useWebcamLifecycle(isReady);

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

  const prevIsScreenShareRef = useRef(isScreenShare);

  useEffect(() => {
    if (prevIsScreenShareRef.current === true && isScreenShare === false) {
      router.back();
    }
    prevIsScreenShareRef.current = isScreenShare;
  }, [isScreenShare, router]);

  useVideoSync(videoRef, sourceType, isReady);
  useWebcamVideoElement(webcamVideoRef, webcamStream, isWebcamActive);

  // 새로고침 감지 및 리다이렉트 (페이지 마운트 시 한 번만 실행)
  useEffect(() => {
    // 클라이언트 사이드에서만 실행
    if (typeof window === "undefined") return;

    // source가 없으면 새로고침으로 간주하여 /ready로 리다이렉트 (짧은 지연 후 체크)
    const timeoutId = setTimeout(() => {
      if (!source) {
        router.push("/ready");
      }
    }, 500);

    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // 마운트 시 한 번만 실행

  useEffect(() => {
    if (source && isInitialized) {
      // console.log("✅ Source와 모델 초기화 완료");
      setIsSetupComplete(true);
    }
  }, [source, isInitialized]);

  useEffect(() => {
    return () => {
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.src = "";
      }
    };
  }, []);

  const handleTogglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    void (video.paused ? video.play() : video.pause());
  };

  const handleSeek = (time: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = time;
    setCurrentTime(time);
  };

  const P1 = webcam.vectorized;
  const P2 = video.vectorized;
  const similarityValue = calculateSimilarity(P1, P2);

  const { videoContainerWidth, webcamContainerWidth } =
    calculateContainerWidths(settings);

  return (
    <div className='flex flex-col h-screen bg-black text-white'>
      <ModelLoadingOverlay />

      <WorkoutHeader
        isReady={isReady}
        onSettingsClick={() => setIsSettingsOpen(true)}
        onExitClick={handleExit}
      />

      <main className='flex flex-1 overflow-hidden'>
        <VideoSection
          videoRef={videoRef}
          isInitialized={isInitialized}
          landmarker={videoLandmarker}
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
          isInitialized={isInitialized}
          landmarker={webcamLandmarker}
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
