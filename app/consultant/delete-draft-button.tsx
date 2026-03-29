"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { deleteConsultantDraftTimesheetAction } from "./actions";

type DeleteDraftButtonProps = {
  timesheetId: string;
};

export function DeleteDraftButton({ timesheetId }: DeleteDraftButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  function onConfirmDelete(): void {
    setErrorMessage(null);

    startTransition(() => {
      deleteConsultantDraftTimesheetAction(timesheetId).then((result) => {
        if (!result.ok) {
          setErrorMessage(result.error);
          return;
        }

        setIsOpen(false);
        router.refresh();
      });
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button size="sm" variant="destructive" disabled={isPending}>
            Delete
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete draft timesheet?</DialogTitle>
            <DialogDescription>
              Please confirm you want to permanently delete this draft timesheet. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" disabled={isPending}>
                Cancel
              </Button>
            </DialogClose>
            <Button
              variant="destructive"
              onClick={onConfirmDelete}
              disabled={isPending}
            >
              Yes, delete draft
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {errorMessage ? (
        <p className="text-xs text-destructive">{errorMessage}</p>
      ) : null}
    </div>
  );
}
