import { useState, useEffect, useCallback, useRef } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ConfirmDialogState {
  open: boolean;
  message: string;
  resolve: ((value: boolean) => void) | null;
}

let showConfirmFn: ((message: string) => Promise<boolean>) | null = null;

export const useConfirm = () => {
  return useCallback((message: string): Promise<boolean> => {
    if (showConfirmFn) return showConfirmFn(message);
    return Promise.resolve(false);
  }, []);
};

export const ConfirmDialog = () => {
  const [state, setState] = useState<ConfirmDialogState>({ open: false, message: "", resolve: null });
  const [animating, setAnimating] = useState(false);
  const backdropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    showConfirmFn = (message: string) => {
      return new Promise<boolean>((resolve) => {
        setState({ open: true, message, resolve });
        setAnimating(true);
      });
    };
    return () => { showConfirmFn = null; };
  }, []);

  const handleClose = (result: boolean) => {
    setAnimating(false);
    setTimeout(() => {
      state.resolve?.(result);
      setState({ open: false, message: "", resolve: null });
    }, 200);
  };

  if (!state.open) return null;

  return (
    <div
      ref={backdropRef}
      className={`fixed inset-0 z-[100] flex items-center justify-center bg-foreground/40 backdrop-blur-sm transition-opacity duration-200 ${animating ? 'opacity-100' : 'opacity-0'}`}
      onClick={(e) => { if (e.target === backdropRef.current) handleClose(false); }}
    >
      <div className={`bg-card border border-border rounded-xl p-6 shadow-lg max-w-sm w-[90%] transition-all duration-200 ${animating ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`} dir="rtl">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5 text-destructive" />
          </div>
          <p className="font-medium text-foreground">{state.message}</p>
        </div>
        <div className="flex gap-3 justify-end">
          <Button variant="outline" onClick={() => handleClose(false)} className="min-w-[70px]">خیر</Button>
          <Button variant="destructive" onClick={() => handleClose(true)} className="min-w-[70px]">بله</Button>
        </div>
      </div>
    </div>
  );
};
