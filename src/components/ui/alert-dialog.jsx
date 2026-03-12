import * as React from "react";
import { createPortal } from "react-dom";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

const AlertDialog = ({ open, onOpenChange, children }) => {
  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 overflow-y-auto">
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => onOpenChange?.(false)}
      />
      <div className="relative z-10 w-full max-w-sm animate-in fade-in-0 zoom-in-95 my-auto">
        {children}
      </div>
    </div>,
    document.body
  );
};

const AlertDialogContent = React.forwardRef(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "bg-white rounded-2xl shadow-2xl overflow-hidden",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
);
AlertDialogContent.displayName = "AlertDialogContent";

const AlertDialogHeader = ({ className, ...props }) => (
  <div
    className={cn("flex flex-col items-center text-center px-6 pt-6 pb-4", className)}
    {...props}
  />
);
AlertDialogHeader.displayName = "AlertDialogHeader";

const AlertDialogIcon = ({ className, variant = "destructive", ...props }) => {
  const styles = {
    destructive: "bg-red-100 text-red-600",
    warning: "bg-amber-100 text-amber-600",
  };
  return (
    <div
      className={cn(
        "w-14 h-14 rounded-full flex items-center justify-center mb-4",
        styles[variant] ?? styles.destructive,
        className
      )}
      {...props}
    >
      <AlertTriangle className="w-7 h-7" />
    </div>
  );
};
AlertDialogIcon.displayName = "AlertDialogIcon";

const AlertDialogTitle = React.forwardRef(({ className, ...props }, ref) => (
  <h2
    ref={ref}
    className={cn("text-base font-semibold text-gray-900 leading-snug", className)}
    {...props}
  />
));
AlertDialogTitle.displayName = "AlertDialogTitle";

const AlertDialogDescription = React.forwardRef(
  ({ className, ...props }, ref) => (
    <p
      ref={ref}
      className={cn("text-sm text-gray-500 mt-1.5", className)}
      {...props}
    />
  )
);
AlertDialogDescription.displayName = "AlertDialogDescription";

const AlertDialogFooter = ({ className, ...props }) => (
  <div
    className={cn("flex gap-3 px-6 pb-6 pt-2", className)}
    {...props}
  />
);
AlertDialogFooter.displayName = "AlertDialogFooter";

const AlertDialogCancel = React.forwardRef(
  ({ className, children = "Hủy", onClick, onOpenChange, ...props }, ref) => (
    <button
      ref={ref}
      onClick={(e) => {
        onOpenChange?.(false);
        onClick?.(e);
      }}
      className={cn(
        "flex-1 py-2.5 px-4 border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors",
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
);
AlertDialogCancel.displayName = "AlertDialogCancel";

const AlertDialogAction = React.forwardRef(
  ({ className, children, variant = "destructive", ...props }, ref) => {
    const styles = {
      destructive:
        "bg-red-600 hover:bg-red-700 active:bg-red-800 text-white",
      warning:
        "bg-amber-500 hover:bg-amber-600 text-white",
    };
    return (
      <button
        ref={ref}
        className={cn(
          "flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
          styles[variant] ?? styles.destructive,
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);
AlertDialogAction.displayName = "AlertDialogAction";

export {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogIcon,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
};
