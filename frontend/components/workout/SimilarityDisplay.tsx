import { useEffect, useRef, useState } from "react";
import { AnimatePresence } from "framer-motion";

interface SimilarityDisplayProps {
  similarityValue: number;
  showFeedback?: boolean;
}

export function SimilarityDisplay({
  similarityValue,
  showFeedback = true,
}: SimilarityDisplayProps) {
  const [displayValue, setDisplayValue] = useState(similarityValue);
  const lastUpdateRef = useRef(Date.now());
  const THROTTLE_MS = 500; // 500ms마다 한 번만 업데이트

  useEffect(() => {
    const now = Date.now();
    if (now - lastUpdateRef.current >= THROTTLE_MS) {
      setDisplayValue(Math.round(similarityValue * 10) / 10);
      lastUpdateRef.current = now;
    }
  }, [similarityValue]);

  const getFeedback = (score: number) => {
    if (score >= 90) return { text: "완벽해요!", emoji: "🎉" };
    if (score >= 80) return { text: "훌륭해요!", emoji: "😊" };
    if (score >= 70) return { text: "잘하고 있어요!", emoji: "👍" };
    if (score >= 50) return { text: "조금 더 힘내요!", emoji: "💪" };
    return { text: "집중해주세요!", emoji: "🎯" };
  };

  const feedback = getFeedback(displayValue);

  return (
    <AnimatePresence>
      <div className='fixed bottom-8 right-8 z-30'>
        <div className='relative bg-transparent backdrop-blur-md rounded-2xl shadow-xl p-8 min-w-[600px]'>
          <div className='text-center text-white/90 font-bold'>
            <div className='text-[70px]'>
              {showFeedback ? (
                <>
                  <span className=' mb-3'>{feedback.emoji} </span>
                  <span className=''>{feedback.text}</span>
                </>
              ) : (
                <div
                  className='text-[70px] font-bold text-white/80 mb-2  text-right'
                  key={displayValue}
                >
                  <span className='mr-3'>{feedback.emoji}</span>
                  {displayValue.toFixed(1)}점
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AnimatePresence>
  );
}
