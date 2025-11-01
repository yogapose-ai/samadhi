"use client";

import { CalculateSimilarity } from "@/lib/mediapipe/angle-calculator";
import { usePoseStore } from "@/store/poseStore";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { FiEyeOff } from "react-icons/fi";

type Timeline = {
  pose: string;
  startTime: number;
  endTime: number;
  similarity: number;
};

export default function TimelineClipper() {
  const { video, webcam } = usePoseStore();
  const [currentPose, setCurrentPose] = useState<string | null>(null);
  const [timelines, setTimelines] = useState<Timeline[]>([]);
  const [similarities, setSimilarities] = useState<number[]>([]);

  useEffect(() => {
    if (video.poseClass !== currentPose) {
      const now = Date.now();
      if (currentPose) {
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
    // console.log('timelines', timelines);
  }, [video.poseClass]);

  useEffect(() => {
    if (timelines.length === 0) return;
    const lastTimeline = timelines[timelines.length - 1];
    if (lastTimeline.endTime === 0) {
      const similarity = CalculateSimilarity(
        webcam.vectorized,
        video.vectorized
      );
      setSimilarities((prev) => [...prev, similarity]);
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
    if (similarity >= 80) return "text-green-400";
    if (similarity >= 60) return "text-yellow-400";
    return "text-red-400";
  };

  const firstStartTime =
    timelines.length > 0 ? timelines[0].startTime : Date.now();

  //   {/* 유사한 floating 컴포넌트 - 가로 스크롤 리스트 */}
  return (
    <AnimatePresence>
      (
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.8 }}
        className="fixed bottom-8 left-8 z-30"
      >
        <div
          className="relative rounded-2xl shadow-2xl p-5 min-w-[260px]"
          style={{
            backgroundImage: "linear-gradient(90deg, #1f2937 0%, #475569 100%)",
            minHeight: "150px",
            maxHeight: "180px",
            display: "flex",
            alignItems: "center",
          }}
        >
          <button
            onClick={() => {
              /* 유저가 닫기 기능을 원한다면: setShowSimilarity(false); */
            }}
            className="absolute -top-2 -right-2 w-6 h-6 bg-gray-800 rounded-full flex items-center justify-center hover:bg-gray-700 transition-colors"
            aria-label="목록 닫기"
            tabIndex={0}
          >
            <FiEyeOff className="w-3 h-3 text-white" />
          </button>
          <div className="w-full overflow-x-auto">
            <div className="flex gap-3 px-2 pt-1 pb-2 min-h-[120px]">
              {timelines.map((item, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex flex-col items-center min-w-[120px] bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/20 hover:bg-white/15 transition-all duration-200"
                >
                  {/* 자세 이름 */}
                  <div className="w-20 h-12 bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center mb-2 shadow-lg">
                    <span className="text-sm font-bold text-white truncate max-w-[10ch]">
                      {item.pose}
                    </span>
                  </div>

                  {/* 시간 정보 */}
                  <div className="w-full space-y-1 mb-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-white/60">시작</span>
                      <span className="text-white font-medium">
                        {formatRelativeTime(item.startTime, firstStartTime)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-white/60">종료</span>
                      <span className="text-white font-medium">
                        {formatRelativeTime(item.endTime, firstStartTime)}
                      </span>
                    </div>
                  </div>

                  {/* 유사도 */}
                  <div className="w-full pt-2 border-t border-white/20">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-white/60">유사도</span>
                      <span
                        className={`text-sm font-bold ${getSimilarityColor(
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
      )
    </AnimatePresence>
  );
}
