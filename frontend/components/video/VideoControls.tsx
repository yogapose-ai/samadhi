"use client";

import { Play, Pause, SkipBack, SkipForward } from "lucide-react";
import { Button, Slider } from "@/components/ui";

interface VideoControlsProps {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  onTogglePlay: () => void;
  onSeek: (time: number) => void;
}

export function VideoControls({
  isPlaying,
  currentTime,
  duration,
  onTogglePlay,
  onSeek,
}: VideoControlsProps) {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleSeekChange = (value: number[]) => {
    onSeek(value[0]);
  };

  const handleSkip = (amount: number) => {
    onSeek(Math.max(0, Math.min(duration, currentTime + amount)));
  };

  return (
    <div className='space-y-2'>
      <div className='space-y-1'>
        <Slider
          value={[currentTime]}
          max={duration}
          step={0.1}
          onValueChange={handleSeekChange}
          disabled={!duration}
          className='cursor-pointer'
        />
        <div className='flex justify-between text-xs font-mono text-white/70'>
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      <div className='flex items-center justify-center gap-3'>
        <Button
          onClick={() => handleSkip(-10)}
          size='icon'
          variant='ghost'
          className='text-white/80 hover:text-white hover:bg-white/10 h-9 w-9'
        >
          <SkipBack className='w-4 h-4' />
        </Button>

        <Button
          onClick={onTogglePlay}
          size='lg'
          className='w-12 h-12 rounded-full bg-white/90 hover:bg-white text-gray-900 backdrop-blur-sm shadow-lg'
        >
          {isPlaying ? (
            <Pause className='w-6 h-6' />
          ) : (
            <Play className='w-6 h-6 translate-x-0.5' />
          )}
        </Button>

        <Button
          onClick={() => handleSkip(10)}
          size='icon'
          variant='ghost'
          className='text-white/80 hover:text-white hover:bg-white/10 h-9 w-9'
        >
          <SkipForward className='w-4 h-4' />
        </Button>
      </div>
    </div>
  );
}
