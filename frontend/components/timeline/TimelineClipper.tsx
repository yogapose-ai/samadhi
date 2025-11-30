"use client";

import { useEffect, useState, forwardRef, useImperativeHandle } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { FiEye, FiEyeOff } from "react-icons/fi";
import { calculateSimilarityWithAnglesAndVectorized } from "@/lib/mediapipe/similarity-calculator";
import { usePoseStore } from "@/store/poseStore";

export type Timeline = {
  pose: string;
  startTime: number;
  endTime: number;
  similarity: number;
};

export type TimelineClipperRef = {
  getTimelines: () => Timeline[];
  getStartTime: () => number;
};

export const TimelineClipper = forwardRef<TimelineClipperRef>((props, ref) => {
  const { video, webcam } = usePoseStore();
  const [currentPose, setCurrentPose] = useState<string>("unknown");
  const [timelines, setTimelines] = useState<Timeline[]>([]);
  const [similarities, setSimilarities] = useState<number[]>([]);
  const [showSimilarity, setShowSimilarity] = useState(true);

  useEffect(() => {
    // console.log(video.poseClass, currentPose);
    if (video.poseClass !== currentPose) {
      const now = Date.now();
      if (currentPose !== "unknown") {
        // End the previous pose timeline
        setTimelines((prev) => {
          const updated = [...prev];
          const lastTimeline = updated[updated.length - 1];
          const avgSimilarity =
            similarities.length > 0
              ? similarities.reduce((a, b) => a + b, 0) / similarities.length
              : 0;
          if (lastTimeline && lastTimeline.endTime === 0) {
            lastTimeline.endTime = now;
            lastTimeline.similarity = avgSimilarity;
            setSimilarities([]); // Reset similarities for the next pose
          }

          return updated;
        });
      }
      // Start a new pose timeline
      if (video.poseClass !== "unknown") {
        setTimelines((prev) => [
          ...prev,
          { pose: video.poseClass, startTime: now, endTime: 0, similarity: 0 },
        ]);
        setCurrentPose(video.poseClass);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [video.poseClass]);

  useEffect(() => {
    if (timelines.length === 0) return;
    const lastTimeline = timelines[timelines.length - 1];
    if (lastTimeline.endTime === 0) {
      const similarity = calculateSimilarityWithAnglesAndVectorized(
        video.vectorized,
        webcam.vectorized,
        video.angles,
        webcam.angles,
        1
      );
      setSimilarities((prev) => [...prev, similarity.combinedScore]);
    }
  }, [timelines, webcam.vectorized, video.vectorized]);

  // 시간을 포맷팅하는 함수 (밀리초 -> 상대 시간 MM:SS 형식)
  const formatRelativeTime = (
    timestamp: number,
    firstStartTime: number
  ): string => {
    if (timestamp === 0) return "진행중";
    const totalSeconds = Math.floor((timestamp - firstStartTime) / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${seconds
      .toString()
      .padStart(2, "0")}`;
  };

  // 유사도를 퍼센트로 변환하는 함수
  const formatSimilarity = (similarity: number): string => {
    if (similarity === 0) return "-";
    return `${Math.round(similarity)}%`;
  };

  // 유사도에 따른 색상 반환
  const getSimilarityColor = (similarity: number): string => {
    if (similarity === 0) return "text-gray-400";
    if (similarity >= 80) return "text-emerald-500";
    if (similarity >= 60) return "text-amber-500";
    return "text-rose-500";
  };

  const firstStartTime =
    timelines.length > 0 ? timelines[0].startTime : Date.now();

  // 부모 컴포넌트에서 타임라인 데이터를 가져올 수 있도록 expose
  useImperativeHandle(ref, () => ({
    getTimelines: () => timelines,
    getStartTime: () => firstStartTime,
  }));

  return (
    <>
      <AnimatePresence>
        {showSimilarity && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className='fixed bottom-8 left-8 z-30'
          >
            <div className='relative bg-white/95 backdrop-blur-md rounded-2xl border border-gray-200/50 p-5 min-w-[280px] max-w-[600px]'>
              <button
                onClick={() => setShowSimilarity(false)}
                className='absolute -top-2 -right-2 w-7 h-7 bg-gray-900 rounded-full flex items-center justify-center hover:bg-gray-800 transition-colors '
                aria-label='목록 닫기'
              >
                <FiEyeOff className='w-4 h-4 text-white' />
              </button>

              <h3 className='text-sm font-semibold text-gray-900 mb-3'>
                자세 타임라인별 유사도
              </h3>

              <div className='overflow-x-auto'>
                <div className='flex gap-3 pb-2 min-h-[140px]'>
                  {timelines.map((item, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className='flex flex-col min-w-[140px] bg-gray-50 rounded-xl p-3 border border-gray-200'
                    >
                      {/* 자세 이름 */}
                      <div className='w-full h-10 bg-linear-to-r from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center mb-3'>
                        <span className='text-sm font-bold text-white truncate px-2'>
                          {item.pose}
                        </span>
                      </div>

                      {/* 시간 정보 */}
                      <div className='space-y-2 mb-3'>
                        <div className='flex items-center justify-between text-xs'>
                          <span className='text-gray-500 font-medium'>
                            시작
                          </span>
                          <span className='text-gray-900 font-semibold'>
                            {formatRelativeTime(item.startTime, firstStartTime)}
                          </span>
                        </div>
                        <div className='flex items-center justify-between text-xs'>
                          <span className='text-gray-500 font-medium'>
                            종료
                          </span>
                          <span className='text-gray-900 font-semibold'>
                            {formatRelativeTime(item.endTime, firstStartTime)}
                          </span>
                        </div>
                      </div>

                      {/* 유사도 */}
                      <div className='pt-3 border-t border-gray-200'>
                        <div className='flex items-center justify-between'>
                          <span className='text-xs text-gray-500 font-medium'>
                            유사도
                          </span>
                          <span
                            className={`text-base font-bold ${getSimilarityColor(
                              item.similarity
                            )}`}
                          >
                            {formatSimilarity(item.similarity)}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!showSimilarity && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setShowSimilarity(true)}
          className='fixed bottom-8 left-8 z-30 w-12 h-12 bg-linear-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center hover:shadow-lg hover:scale-105 transition-all shadow-md'
        >
          <FiEye className='w-6 h-6 text-white' />
        </motion.button>
      )}
    </>
  );
});

TimelineClipper.displayName = "TimelineClipper";
