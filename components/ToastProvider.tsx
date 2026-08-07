"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

type ToastItem = {
  id: number;
  message: string;
  emoji?: string;
  milestone?: boolean;
};

type Ctx = {
  showToast: (message: string, emoji?: string, milestone?: boolean) => void;
};

const ToastContext = createContext<Ctx | null>(null);

let idSeq = 1;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const showToast = useCallback(
    (message: string, emoji?: string, milestone?: boolean) => {
      const id = idSeq++;
      setItems((prev) => [...prev, { id, message, emoji, milestone }]);
      window.setTimeout(() => {
        setItems((prev) => prev.filter((t) => t.id !== id));
      }, milestone ? 3600 : 2800);
    },
    [],
  );

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="anime-toast-stack" aria-live="polite">
        {items.map((t) => (
          <div
            key={t.id}
            className={"anime-toast" + (t.milestone ? " milestone" : "")}
          >
            {t.emoji ? (
              <span className="anime-toast-emoji">{t.emoji}</span>
            ) : null}
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
