import { useEffect, useState } from "react";
import { useMediaPipe } from "@/hooks/useMediaPipe";

interface LoadingStage {
  name: string;
  completed: boolean;
  timestamp?: number;
}

// 디버그용: 로딩 강제로 막기 (테스트 후 false로 설정 필요)
const FORCE_LOADING_DELAY = false;
const LOADING_DELAY_MS = 10000;

export function ModelLoadingOverlay() {
  const { isInitialized, videoLandmarker, webcamLandmarker } = useMediaPipe();
  const [stages, setStages] = useState<LoadingStage[]>([
    { name: "비디오 포즈 모델 로딩", completed: false },
    { name: "웹캠 포즈 모델 로딩", completed: false },
    { name: "초기화 완료", completed: false },
  ]);
  const [startTime] = useState<number>(Date.now());
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const [forceDelayActive, setForceDelayActive] = useState(FORCE_LOADING_DELAY);

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedTime(Date.now() - startTime);
    }, 100);

    return () => clearInterval(interval);
  }, [startTime]);

  useEffect(() => {
    if (!FORCE_LOADING_DELAY) return;
    // console.log(`⏱️ [DEBUG] 로딩 강제 지연 시작: ${LOADING_DELAY_MS}ms`);
    const timeout = setTimeout(() => {
      // console.log(`✅ [DEBUG] 로딩 강제 지연 완료`);
      setForceDelayActive(false);
    }, LOADING_DELAY_MS);

    return () => clearTimeout(timeout);
  }, []);

  useEffect(() => {
    const now = Date.now();
    setStages((prev) => [
      {
        ...prev[0],
        completed: !!videoLandmarker,
        timestamp:
          videoLandmarker && !prev[0].completed ? now : prev[0].timestamp,
      },
      {
        ...prev[1],
        completed: !!webcamLandmarker,
        timestamp:
          webcamLandmarker && !prev[1].completed ? now : prev[1].timestamp,
      },
      {
        ...prev[2],
        completed: isInitialized && !forceDelayActive,
        timestamp:
          isInitialized && !forceDelayActive && !prev[2].completed
            ? now
            : prev[2].timestamp,
      },
    ]);

    // 로딩 상태 로그
    if (videoLandmarker) {
      // console.log(
      //   `✅ 비디오 모델 로드 완료: ${((now - startTime) / 1000).toFixed(2)}s`
      // );
    }
    if (webcamLandmarker) {
      // console.log(
      //   `✅ 웹캠 모델 로드 완료: ${((now - startTime) / 1000).toFixed(2)}s`
      // );
    }
    if (isInitialized && !forceDelayActive) {
      // console.log(
      //   `✅ 전체 초기화 완료: ${((now - startTime) / 1000).toFixed(2)}s`
      // );
    }
  }, [
    videoLandmarker,
    webcamLandmarker,
    isInitialized,
    forceDelayActive,
    startTime,
  ]);

  if (isInitialized && !forceDelayActive) return null;

  const completedCount = stages.filter((s) => s.completed).length;
  const progress = (completedCount / stages.length) * 100;
  const elapsedSeconds = (elapsedTime / 1000).toFixed(1);

  return (
    <div className='fixed inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm z-50'>
      <div className='max-w-md w-full mx-4 p-8 bg-gray-900 rounded-xl shadow-2xl border border-white/10'>
        {/* 타이틀 */}
        <div className='text-center mb-6'>
          <div className='w-16 h-16 mx-auto mb-4 border-4 border-blue-400 rounded-full border-t-transparent animate-spin'></div>
          <h2 className='text-xl font-bold text-white mb-2'>AI 모델 로딩 중</h2>
          <p className='text-sm text-gray-400'>
            잠시만 기다려주세요. 첫 로딩은 시간이 걸릴 수 있습니다.
          </p>
          {/* 경과 시간 표시 */}
          <div className='mt-3 text-lg font-mono text-blue-400'>
            {elapsedSeconds}초
          </div>
        </div>

        {/* 진행률 바 */}
        <div className='mb-6'>
          <div className='flex justify-between text-xs text-gray-400 mb-2'>
            <span>진행률</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className='w-full h-2 bg-gray-800 rounded-full overflow-hidden'>
            <div
              className='h-full bg-linear-to-r from-blue-500 to-blue-400 transition-all duration-500 ease-out'
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>

        {/* 로딩 단계 */}
        <div className='space-y-3'>
          {stages.map((stage, index) => {
            const stageTime = stage.timestamp
              ? ((stage.timestamp - startTime) / 1000).toFixed(2)
              : null;

            return (
              <div
                key={index}
                className='flex items-center gap-3 text-sm transition-all duration-300'
              >
                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-300 shrink-0 ${
                    stage.completed
                      ? "bg-blue-500 border-blue-500"
                      : "border-gray-600"
                  }`}
                >
                  {stage.completed && (
                    <svg
                      className='w-3 h-3 text-white'
                      fill='none'
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth='2'
                      viewBox='0 0 24 24'
                      stroke='currentColor'
                    >
                      <path d='M5 13l4 4L19 7'></path>
                    </svg>
                  )}
                </div>
                <div className='flex-1 flex items-center justify-between'>
                  <span
                    className={`transition-colors duration-300 ${
                      stage.completed ? "text-white" : "text-gray-500"
                    }`}
                  >
                    {stage.name}
                  </span>
                  {stageTime && (
                    <span className='text-xs font-mono text-blue-400 ml-2'>
                      {stageTime}s
                    </span>
                  )}
                </div>
                {!stage.completed &&
                  index === stages.findIndex((s) => !s.completed) && (
                    <div className='ml-2'>
                      <div className='flex gap-1'>
                        <div className='w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce'></div>
                        <div
                          className='w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce'
                          style={{ animationDelay: "0.1s" }}
                        ></div>
                        <div
                          className='w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce'
                          style={{ animationDelay: "0.2s" }}
                        ></div>
                      </div>
                    </div>
                  )}
              </div>
            );
          })}
        </div>

        {/* 디버그 정보 */}
        {FORCE_LOADING_DELAY && (
          <div className='mt-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg'>
            <p className='text-xs text-yellow-300 text-center font-mono'>
              🔧 DEBUG MODE:{" "}
              {forceDelayActive
                ? `${LOADING_DELAY_MS / 1000}초 강제 지연 중...`
                : "강제 지연 완료"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
