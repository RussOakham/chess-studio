"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogClose,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { game as gameCopy } from "@/lib/copy";

export function GameResignDialog({
  open,
  onOpenChange,
  isResigning,
  resignError,
  onConfirmResign,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isResigning: boolean;
  resignError: string | null;
  onConfirmResign: () => Promise<void>;
}) {
  return (
    <AlertDialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && isResigning) {
          return;
        }
        onOpenChange(nextOpen);
      }}
    >
      <AlertDialogContent size="default" className="max-w-sm">
        <div className="flex flex-col gap-3">
          <AlertDialogHeader className="flex flex-col gap-1 p-0 text-left sm:text-left">
            <div className="flex w-full items-center gap-2">
              <AlertDialogTitle className="flex-1 leading-tight">
                {gameCopy.resign.title}
              </AlertDialogTitle>
              <AlertDialogClose
                className="static shrink-0"
                disabled={isResigning}
              />
            </div>
            <AlertDialogDescription>
              {gameCopy.resign.description}
            </AlertDialogDescription>
            {resignError ? (
              <p className="text-sm text-destructive" role="alert">
                {resignError}
              </p>
            ) : null}
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <AlertDialogCancel disabled={isResigning}>
              {gameCopy.resign.cancel}
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={isResigning}
              onClick={() => {
                void onConfirmResign();
              }}
            >
              {isResigning ? gameCopy.resign.pending : gameCopy.resign.confirm}
            </AlertDialogAction>
          </AlertDialogFooter>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
