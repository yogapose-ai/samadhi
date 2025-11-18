"use client";

import { useEffect, useRef, useState } from "react";
import { useVideoStore } from "@/store/videoStore";
import {
  StepChoice,
  StepConfirmation,
  Stepper,
  StepScreenShare,
  StepWebcam,
  StepSampleVideo,
} from "@/components/ready";

export default function ReadyPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const sectionRefs = useRef<HTMLElement[]>([]);
  const { setVideo } = useVideoStore();

  const [workoutType, setWorkoutType] = useState<"screen" | "sample" | null>(
    null
  );
  const [isScreenShareActive, setIsScreenShareActive] = useState(false);
  const [selectedSampleVideo, setSelectedSampleVideo] = useState<{
    title: string;
    path: string;
  } | null>(null);
  const [isWebcamActive, setIsWebcamActive] = useState(false);

  // 자동 스크롤 활성화 여부 제어 플래그
  const [isAutoScrollEnabled, setIsAutoScrollEnabled] = useState(true);

  const steps = [
    "운동 방식",
    workoutType === "screen"
      ? "화면 공유"
      : workoutType === "sample"
      ? "샘플 영상"
      : "영상 선택",
    "웹캠 설정",
    "최종 확인",
  ];

  const finalStep = steps.length - 1;

  useEffect(() => {
    const currentRefs = sectionRefs.current.filter((ref) => ref !== null);

    const observers = currentRefs.map((section, index) => {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              const stepNumber = index + 1;
              setCurrentStep(stepNumber);

              // 최종 스텝에 도달하면 자동 스크롤을 비활성화
              if (stepNumber === finalStep) {
                setIsAutoScrollEnabled(false);
              }
            }
          });
        },
        {
          threshold: 0,
          rootMargin: "-50% 0px -50% 0px",
        }
      );

      observer.observe(section);
      return observer;
    });

    return () => {
      observers.forEach((observer) => observer.disconnect());
    };
  }, [workoutType, finalStep]);

  // 중간 단계로의 스크롤 (항상 허용됨)
  const handleScrollToIntermediateStep = (
    targetIndex: number,
    delay: number
  ) => {
    setTimeout(() => {
      sectionRefs.current[targetIndex]?.scrollIntoView({ behavior: "smooth" });
    }, delay);
  };

  // 최종 단계로의 스크롤 (플래그 확인 후 허용됨)
  const handleScrollToFinalStep = (delay: number) => {
    if (isAutoScrollEnabled) {
      setTimeout(() => {
        sectionRefs.current[3]?.scrollIntoView({ behavior: "smooth" });
      }, delay);
    }
  };

  const handleSelectType = (type: "screen" | "sample") => {
    setWorkoutType(type);
    handleScrollToIntermediateStep(1, 100);
  };

  const handleScreenShareComplete = (didStart: boolean) => {
    setIsScreenShareActive(didStart);
    if (didStart) {
      if (currentStep <= 2) {
        handleScrollToIntermediateStep(2, 300);
      }
    }
  };

  const handleSampleVideoComplete = (
    video: { title: string; path: string } | null
  ) => {
    setSelectedSampleVideo(video);
    if (video) {
      setVideo(video.path, video.title);

      // 스텝 2 완료 후 (인덱스 1) 다음 스텝(인덱스 2)으로 이동
      if (currentStep <= 2) {
        handleScrollToIntermediateStep(2, 300);
      }
    }
  };

  const handleWebcamComplete = (isActive: boolean) => {
    setIsWebcamActive(isActive);
    if (isActive) {
      // 스텝 3 완료 후 (인덱스 2) 최종 스텝(인덱스 3)으로 이동
      if (currentStep <= 3) {
        handleScrollToFinalStep(500);
      }
    }
  };

  const workoutSelected = isScreenShareActive || selectedSampleVideo !== null;
  const workoutTitle = isScreenShareActive
    ? "화면 공유"
    : selectedSampleVideo?.title || "없음";
  const workoutPath = isScreenShareActive
    ? "SCREEN_SHARE"
    : selectedSampleVideo?.path || "#";

  return (
    <div className='min-h-screen bg-[#EFF3FF]'>
      <Stepper currentStep={currentStep} steps={steps} />

      <div className='ml-64 p-8'>
        <section
          ref={(el) => {
            if (el) sectionRefs.current[0] = el;
          }}
          className='flex items-center justify-center py-20'
        >
          <StepChoice onSelectType={handleSelectType} />
        </section>

        {workoutType === "screen" && (
          <section
            ref={(el) => {
              if (el) sectionRefs.current[1] = el;
            }}
            className='min-h-screen flex items-center justify-center'
          >
            <StepScreenShare
              onComplete={handleScreenShareComplete}
              isSelected={isScreenShareActive}
            />
          </section>
        )}

        {workoutType === "sample" && (
          <section
            ref={(el) => {
              if (el) sectionRefs.current[1] = el;
            }}
            className='min-h-screen flex items-center justify-center'
          >
            <StepSampleVideo onComplete={handleSampleVideoComplete} />
          </section>
        )}

        {workoutType !== null && (
          <section
            ref={(el) => {
              if (el) sectionRefs.current[2] = el;
            }}
            className='min-h-screen flex items-center justify-center'
          >
            <StepWebcam onComplete={handleWebcamComplete} />
          </section>
        )}

        {workoutSelected && (
          <section
            ref={(el) => {
              if (el) sectionRefs.current[3] = el;
            }}
            className='flex items-center justify-center py-20'
          >
            <StepConfirmation
              workoutSelected={workoutSelected}
              workoutTitle={workoutTitle}
              webcamActive={isWebcamActive}
              workoutType={workoutType}
              workoutPath={workoutPath}
            />
          </section>
        )}
      </div>
    </div>
  );
}
