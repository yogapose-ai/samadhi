import { useEffect, useRef } from "react";

interface UseCanvasCaptureProps {
  poseClass: string | null;
  enabled?: boolean;
}

export function useCanvasCapture({
  poseClass,
  enabled = true,
}: UseCanvasCaptureProps) {
  const previousPoseClassRef = useRef<string | null>(null);

  // canvas 요소를 찾아서 이미지로 캡쳐하는 함수
  const captureCanvas = (selector: string, filename: string): void => {
    try {
      const canvasElement = document.querySelector(
        selector
      ) as HTMLCanvasElement;
      if (!canvasElement) {
        console.warn(`${selector} 요소를 찾을 수 없습니다.`);
        return;
      }

      // canvas를 이미지로 변환
      canvasElement.toBlob(
        (blob) => {
          if (!blob) {
            console.error("이미지 변환에 실패했습니다.");
            return;
          }

          // Blob URL 생성
          const url = URL.createObjectURL(blob);

          // 다운로드 링크 생성 및 클릭
          const link = document.createElement("a");
          link.href = url;
          link.download = filename;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);

          // URL 해제
          setTimeout(() => URL.revokeObjectURL(url), 100);
        },
        "image/png",
        1.0
      );
    } catch (error) {
      console.error("캡쳐 중 오류 발생:", error);
    }
  };

  // poseClass가 변경될 때 캡쳐
  useEffect(() => {
    if (!enabled) return;

    if (
      poseClass &&
      poseClass !== previousPoseClassRef.current &&
      poseClass !== "unknown" &&
      previousPoseClassRef.current !== null
    ) {
      // 약간의 지연을 주어 canvas가 업데이트되도록 함
      setTimeout(() => {
        const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
        const poseName = poseClass || "unknown";

        // 비디오 canvas 캡쳐 (스켈레톤 포함)
        captureCanvas(
          "canvas[data-capture='video-canvas']",
          `video-${poseName}-${timestamp}.png`
        );

        // 웹캠 canvas 캡쳐 (스켈레톤 포함)
        captureCanvas(
          "canvas[data-capture='webcam-canvas']",
          `webcam-${poseName}-${timestamp}.png`
        );
      }, 200);
    }

    previousPoseClassRef.current = poseClass;
  }, [poseClass, enabled]);

  return { captureCanvas };
}

