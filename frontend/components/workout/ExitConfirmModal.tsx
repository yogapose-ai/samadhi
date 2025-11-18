import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ExitConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isSubmitting?: boolean;
}

export function ExitConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  isSubmitting = false,
}: ExitConfirmModalProps) {
  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className='bg-white border-gray-200 text-gray-900 max-w-md'>
        <AlertDialogHeader>
          <AlertDialogTitle className='text-xl font-semibold text-gray-900'>
            운동을 종료할까요?
          </AlertDialogTitle>
          <AlertDialogDescription className='text-gray-600 text-base'>
            오늘 진행한 운동이 기록됩니다!
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className='gap-2 sm:gap-2'>
          <AlertDialogCancel
            disabled={isSubmitting}
            className='bg-gray-100 text-gray-900 hover:bg-gray-200 border-gray-300 hover:text-gray-900 m-0 disabled:opacity-50 disabled:cursor-not-allowed'
          >
            취소
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isSubmitting}
            className='bg-red-500 text-white hover:bg-red-600 m-0 disabled:opacity-50 disabled:cursor-not-allowed'
          >
            {isSubmitting ? "저장 중..." : "종료"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
