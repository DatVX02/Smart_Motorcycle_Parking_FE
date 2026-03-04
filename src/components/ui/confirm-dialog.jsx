import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogIcon,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";

/**
 * ConfirmDialog – thay thế native confirm()
 *
 * Props:
 *   open         boolean
 *   onClose      () => void        — gọi khi đóng (cả huỷ lẫn xác nhận)
 *   onConfirm    () => void        — gọi khi bấm nút xác nhận
 *   title        string
 *   description  string
 *   confirmLabel string  (default "Xác nhận")
 *   cancelLabel  string  (default "Hủy")
 *   variant      "destructive" | "warning"  (default "destructive")
 */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title = "Xác nhận",
  description,
  confirmLabel = "Xác nhận",
  cancelLabel = "Hủy",
  variant = "destructive",
}) {
  const handleConfirm = () => {
    onClose();
    onConfirm?.();
  };

  return (
    <AlertDialog open={open} onOpenChange={(v) => !v && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogIcon variant={variant} />
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description && (
            <AlertDialogDescription>{description}</AlertDialogDescription>
          )}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose}>{cancelLabel}</AlertDialogCancel>
          <AlertDialogAction variant={variant} onClick={handleConfirm}>
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
