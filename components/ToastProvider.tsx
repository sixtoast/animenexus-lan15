"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { OutcomeMark } from "@/components/rive/OutcomeMark";
import { playCue } from "@/lib/sound-engine";

export type ToastTone = "neutral" | "success" | "error";

export type ToastOptions = {
  emoji?: string;
  milestone?: boolean;
  /** Visual tone — only use success after real confirmation */
  tone?: ToastTone;
};

type ToastItem = {
  id: number;
  message: string;
  emoji?: string;
  milestone?: boolean;
  tone: ToastTone;
};

type Ctx = {
  showToast: (
    message: string,
    emojiOrOpts?: string | ToastOptions,
    milestone?: boolean,
  ) => void;
};

const ToastContext = createContext<Ctx | null>(null);

let idSeq = 1;

function resolveOpts(
  emojiOrOpts?: string | ToastOptions,
  milestone?: boolean,
): ToastOptions {
  if (emojiOrOpts && typeof emojiOrOpts === "object") {
    return emojiOrOpts;
  }
  return {
    emoji: typeof emojiOrOpts === "string" ? emojiOrOpts : undefined,
    milestone,
    tone: "neutral",
  };
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const showToast = useCallback(
    (
      message: string,
      emojiOrOpts?: string | ToastOptions,
      milestone?: boolean,
    ) => {
      const opts = resolveOpts(emojiOrOpts, milestone);
      const tone = opts.tone || "neutral";
      if (tone === "success") playCue("success");
      else if (tone === "error") playCue("error");
      else if (opts.milestone) playCue("complete");
      const id = idSeq++;
      setItems((prev) => [
        ...prev,
        {
          id,
          message,
          emoji: opts.emoji,
          milestone: opts.milestone,
          tone,
        },
      ]);
      window.setTimeout(
        () => {
          setItems((prev) => prev.filter((t) => t.id !== id));
        },
        opts.milestone ? 3600 : 2800,
      );
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
            className={
              "anime-toast" +
              (t.milestone ? " milestone" : "") +
              (t.tone !== "neutral" ? ` tone-${t.tone}` : "")
            }
            data-tone={t.tone !== "neutral" ? t.tone : undefined}
          >
            {t.tone === "success" || t.tone === "error" ? (
              <OutcomeMark
                tone={t.tone}
                size="sm"
                className="anime-toast-mark"
              />
            ) : t.emoji ? (
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
