import { AnimatePresence } from "framer-motion";
import { useEffect, useRef, useState } from "react";

interface SimilarityDisplayProps {
  similarityValue: number;
}

export default function SimilarityDisplay({
  similarityValue,
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

  return (
    <AnimatePresence>
      <div className='fixed top-8 right-8 z-30'>
        <div className='relative bg-transparent backdrop-blur-md rounded-2xl shadow-xl  p-6 min-w-[180px]'>
          <div>
            <h3 className='text-sm font-semibold text-white/80 mb-3'>
              현재 유사도
            </h3>
            <div
              className='text-4xl font-bold text-white/80 mb-2 w-36 text-center'
              key={displayValue}
            >
              {displayValue.toFixed(1)}%
            </div>
            <div className='flex items-center justify-center gap-1 mt-3'>
              <div className='w-full bg-white/20 rounded-full h-2.5 overflow-hidden'>
                <div
                  className='h-full bg-white/80 rounded-full transition-all duration-300'
                  style={{ width: `${displayValue}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </AnimatePresence>
  );
}
