"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogClose,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { game as gameCopy } from "@/lib/copy";

export function GameCompletionDialog({
  open,
  onOpenChange,
  gameOverMessage,
  onNavigateReview,
  onNavigateDashboard,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  gameOverMessage: string;
  onNavigateReview: () => void;
  onNavigateDashboard: () => void;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent size="default" className="max-w-sm">
        <div className="flex flex-col gap-3">
          <AlertDialogHeader className="flex flex-col gap-1 p-0 text-left sm:text-left">
            <div className="flex w-full items-center gap-2">
              <AlertDialogTitle className="flex-1 leading-tight">
                {gameCopy.completionModal.title}
              </AlertDialogTitle>
              <AlertDialogClose className="static shrink-0" />
            </div>
            <AlertDialogDescription>{gameOverMessage}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-2 sm:flex-col">
            <AlertDialogAction onClick={onNavigateReview}>
              {gameCopy.completionModal.reviewGame}
            </AlertDialogAction>
            <AlertDialogAction variant="outline" onClick={onNavigateDashboard}>
              {gameCopy.completionModal.backToDashboard}
            </AlertDialogAction>
          </AlertDialogFooter>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
