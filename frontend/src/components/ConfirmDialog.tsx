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
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

// Reusable confirmation dialog used anywhere we need a "type to delete" /
// "are you sure" step before an irreversible action. Built on shadcn's
// AlertDialog so keyboard focus trap, Escape-to-dismiss, and screen-reader
// semantics are all handled for us.
//
// IS 414 grading rule: every delete in the app MUST have a confirmation
// dialog. Use this component for all of them so the experience is consistent.
//
// Typical usage inside a page:
//
//   const [toDelete, setToDelete] = useState<Row | null>(null);
//   const deleteMut = useMutation({ ... });
//
//   <Button onClick={() => setToDelete(row)}>Delete</Button>
//
//   <ConfirmDialog
//     open={!!toDelete}
//     onOpenChange={(v) => { if (!v) setToDelete(null); }}
//     title="Delete safehouse?"
//     description={`This will permanently delete "${toDelete?.name}".`}
//     confirmLabel="Delete"
//     destructive
//     loading={deleteMut.isPending}
//     onConfirm={() => {
//       if (!toDelete) return;
//       deleteMut.mutate(toDelete.id, {
//         onSuccess: () => setToDelete(null),
//       });
//     }}
//   />

export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  // Render the confirm button in the destructive style. Default true — most
  // callers of this component are delete buttons.
  destructive?: boolean;
  // When true the confirm button is disabled and shows a spinner label.
  loading?: boolean;
  onConfirm: () => void;
}

export default function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  destructive = true,
  loading = false,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description && (
            <AlertDialogDescription>{description}</AlertDialogDescription>
          )}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>{cancelLabel}</AlertDialogCancel>
          <AlertDialogAction
            // Prevent the AlertDialog from auto-closing on click — we want the
            // parent mutation to control when the dialog closes so the user
            // sees the loading state.
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
            }}
            disabled={loading}
            className={cn(
              destructive &&
                buttonVariants({ variant: "destructive" }),
            )}
          >
            {loading ? "Working…" : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
