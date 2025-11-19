import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useVideoStore } from "@/store";
import { toast } from "sonner";
import api from "@/lib/axios";

interface Timeline {
  startTime: number;
  endTime?: number;
  pose: string;
  similarity: number;
}

interface TimelineClipperRef {
  getTimelines: () => Timeline[];
  getStartTime: () => number;
}

export function useWorkoutExit(
  timelineClipperRef: React.RefObject<TimelineClipperRef | null>
) {
  const router = useRouter();
  const { source, sourceType } = useVideoStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isExitModalOpen, setIsExitModalOpen] = useState(false);
  const workoutStartTimeRef = useRef<number>(Date.now());

  const handleExit = () => {
    setIsExitModalOpen(true);
  };

  const handleCancelExit = () => {
    if (!isSubmitting) {
      setIsExitModalOpen(false);
    }
  };

  const handleConfirmExit = async () => {
    try {
      setIsSubmitting(true);

      // 타임라인 데이터 가져오기
      const timelines = timelineClipperRef.current?.getTimelines() || [];
      const startTime =
        timelineClipperRef.current?.getStartTime() ||
        workoutStartTimeRef.current;

      if (timelines.length === 0) {
        toast.error("저장할 운동 데이터가 없습니다.");
        setIsSubmitting(false);
        return;
      }

      // 운동 시간 계산 (초 단위)
      const endTime = Date.now();
      const workingoutTime = Math.floor((endTime - startTime) / 1000);

      // 총 점수 계산 (평균 유사도)
      const totalScore = Math.round(
        timelines.reduce((sum, t) => sum + t.similarity, 0) / timelines.length
      );

      // 유튜브 URL
      const youtubeUrl =
        sourceType === "url" && typeof source === "string"
          ? source
          : sourceType === "stream"
          ? "screen-share"
          : "";

      // 타임라인 데이터 변환 (첫 시작 시간 기준 상대 시간)
      const timelineData = timelines.map((timeline) => {
        const startTimeSec = Math.floor(
          (timeline.startTime - startTime) / 1000
        );
        const endTimeSec = Math.floor(
          ((timeline.endTime || Date.now()) - startTime) / 1000
        );

        return {
          youtube_start_sec: startTimeSec,
          youtube_end_sec: endTimeSec,
          pose: timeline.pose,
          score: Math.round(timeline.similarity),
        };
      });

      // 서버에 전송할 데이터
      const recordData = {
        datetime: new Date().toISOString(),
        workingout_time: workingoutTime,
        youtube_url: youtubeUrl,
        total_score: totalScore,
        timeLineList: timelineData,
      };

      // API 호출
      const res = await api.post("/api/record/", recordData);
      const newId = res?.data?.message?.id;

      if (newId) {
        toast.success("운동 기록이 저장되었습니다.");
        router.push(`/record?openId=${newId}`);
        return;
      }
    } catch {
      toast.error("운동 기록 저장에 실패했습니다.");
      setIsSubmitting(false);
    }
  };

  return {
    isSubmitting,
    isExitModalOpen,
    handleExit,
    handleCancelExit,
    handleConfirmExit,
  };
}
