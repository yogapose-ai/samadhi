import { FiSettings, FiX } from "react-icons/fi";
import { Button } from "@/components/ui/button";

interface WorkoutHeaderProps {
  isReady: boolean;
  onSettingsClick: () => void;
  onExitClick: () => void;
}

export function WorkoutHeader({
  isReady,
  onSettingsClick,
  onExitClick,
}: WorkoutHeaderProps) {
  return (
    <header className='flex items-center justify-between px-4 py-2 bg-black/80 backdrop-blur-sm z-40 shrink-0'>
      <Button
        variant='outline'
        onClick={onSettingsClick}
        disabled={!isReady}
        className='flex items-center justify-center gap-2 w-20 bg-white/10 border-white/20 text-white hover:bg-white hover:text-black disabled:opacity-50'
      >
        <FiSettings className='w-4 h-4' />
        <span className='hidden sm:inline'>설정</span>
      </Button>

      <div className='flex-1'></div>

      <Button
        variant='outline'
        onClick={onExitClick}
        disabled={!isReady}
        className='flex items-center justify-center gap-2 w-20 bg-white/10 border-white/20 text-white hover:text-white hover:bg-red-600 hover:border-red-600 disabled:opacity-50'
      >
        <FiX className='w-4 h-4' />
        <span className='hidden sm:inline'>종료</span>
      </Button>
    </header>
  );
}
