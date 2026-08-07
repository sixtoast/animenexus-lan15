"use client";

import { useEffect, useState } from "react";
import {
  AI_PRESETS,
  defaultSettings,
  isAIConfigured,
  readAISettings,
  writeAISettings,
  type AIProviderId,
  type AISettings,
} from "@/lib/ai-settings";
import { streamChatCompletions, testAIConnection } from "@/lib/ai-chat";
import { memoryDigestForAI } from "@/lib/lantern-memory";
import { useWatchlist } from "@/components/WatchlistProvider";
import { useToast } from "@/components/ToastProvider";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";

type Msg = { role: "user" | "assistant" | "system"; content: string };

const QUICK = [
  "What should I watch tonight from a chill mood?",
  "Explain my taste in one paragraph.",
  "Give me a 3-title underwatched shortlist.",
];

export function AIPanel() {
  const [open, setOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settings, setSettings] = useState<AISettings>(defaultSettings());
  const [configured, setConfigured] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const { showToast } = useToast();
  const { entries } = useWatchlist();

  useEffect(() => {
    const s = readAISettings();
    setSettings(s);
    setConfigured(isAIConfigured(s));
  }, [open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (
        (e.key === "a" || e.key === "A") &&
        !e.metaKey &&
        !e.ctrlKey &&
        !e.altKey
      ) {
        const t = e.target as HTMLElement | null;
        if (
          t &&
          (t.tagName === "INPUT" ||
            t.tagName === "TEXTAREA" ||
            t.isContentEditable)
        )
          return;
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function saveSettings() {
    writeAISettings(settings);
    setConfigured(isAIConfigured(settings));
    showToast("AI settings saved", "🤖");
    setSettingsOpen(false);
  }

  function applyPreset(p: AIProviderId) {
    if (p === "custom") {
      setSettings((s) => ({ ...s, provider: "custom" }));
      return;
    }
    const preset = AI_PRESETS[p];
    setSettings((s) => ({
      ...s,
      provider: p,
      baseUrl: preset.baseUrl,
      model: preset.model,
    }));
  }

  async function test() {
    writeAISettings(settings);
    setBusy(true);
    try {
      const reply = await testAIConnection();
      setMessages((m) => [...m, { role: "assistant", content: reply }]);
      setConfigured(true);
      showToast("AI connected", "✅");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Test failed", "😅");
    } finally {
      setBusy(false);
    }
  }

  function systemPrompt() {
    const watching = entries
      .filter((e) => e.watchStatus === "watching")
      .map((e) => e.title);
    const completedCount = entries.filter(
      (e) => e.watchStatus === "completed",
    ).length;
    const digest = memoryDigestForAI({ watching, completedCount });
    return [
      "You are Lantern — host of AnimeNexus, not a generic chatbot.",
      "Speak warm, concise, anime-literate. No fake ARG codes or invented lists the user doesn't have.",
      "Use the memory digest when relevant; if memory is empty, say so honestly.",
      digest,
    ].join("\n\n");
  }

  async function send(text: string) {
    const v = text.trim();
    if (!v || busy) return;
    if (!isAIConfigured(settings) && !isAIConfigured()) {
      showToast("Add an API key in settings", "🤖");
      setSettingsOpen(true);
      return;
    }
    setInput("");
    const next: Msg[] = [...messages, { role: "user", content: v }];
    setMessages([...next, { role: "assistant", content: "" }]);
    setBusy(true);
    try {
      await streamChatCompletions(
        [
          { role: "system", content: systemPrompt() },
          ...next.map((m) => ({
            role: m.role as "user" | "assistant" | "system",
            content: m.content,
          })),
        ],
        {
          settings: readAISettings(),
          onToken: (chunk) => {
            setMessages((m) => {
              const copy = [...m];
              const last = copy[copy.length - 1];
              if (last?.role === "assistant") {
                copy[copy.length - 1] = {
                  role: "assistant",
                  content: last.content + chunk,
                };
              }
              return copy;
            });
          },
        },
      );
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Chat failed", "😅");
      setMessages((m) =>
        m.filter((x, i) => !(i === m.length - 1 && !x.content)),
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        className="ai-fab"
        aria-label="Open AI panel"
        title="AI panel (A)"
        onClick={() => setOpen(true)}
      >
        🤖
        <span
          className={"ai-status-dot" + (configured ? " on" : "")}
          aria-hidden
        />
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="AI desk"
        label="AI panel"
        variant="drawer"
        headerActions={
          <>
            <Button
              variant="icon"
              size="sm"
              onClick={() => setSettingsOpen((v) => !v)}
              title="Settings"
              aria-label="Settings"
            >
              ⚙
            </Button>
            <Button
              variant="icon"
              size="sm"
              onClick={() => setMessages([])}
              title="Clear"
              aria-label="Clear messages"
            >
              ⌫
            </Button>
          </>
        }
        panelClassName="ai-panel-modal"
      >
        <div className="ai-panel-inner">
          <div className="ai-header-status">
            <span
              className={"ai-status-dot" + (configured ? " on" : "")}
              title={configured ? "Key present" : "Not configured"}
            />
            <span className="ai-status-label">
              {configured ? "Signal locked" : "No key"}
            </span>
          </div>

          {settingsOpen ? (
            <div className="ai-settings">
              <label className="filter-label">Provider</label>
              <select
                className="filter-input"
                value={settings.provider}
                onChange={(e) => applyPreset(e.target.value as AIProviderId)}
              >
                <option value="openrouter">OpenRouter</option>
                <option value="openai">OpenAI</option>
                <option value="gemini">Gemini</option>
                <option value="groq">Groq</option>
                <option value="custom">Custom</option>
              </select>
              <label className="filter-label">Base URL</label>
              <input
                className="filter-input"
                value={settings.baseUrl}
                onChange={(e) =>
                  setSettings((s) => ({ ...s, baseUrl: e.target.value }))
                }
              />
              <label className="filter-label">Model</label>
              <input
                className="filter-input"
                value={settings.model}
                onChange={(e) =>
                  setSettings((s) => ({ ...s, model: e.target.value }))
                }
              />
              <label className="filter-label">API key</label>
              <input
                className="filter-input"
                type="password"
                autoComplete="off"
                value={settings.apiKey}
                onChange={(e) =>
                  setSettings((s) => ({ ...s, apiKey: e.target.value }))
                }
                placeholder="sk-…"
              />
              <label className="filter-label">Fallback key (optional)</label>
              <input
                className="filter-input"
                type="password"
                autoComplete="off"
                value={settings.fallbackKey || ""}
                onChange={(e) =>
                  setSettings((s) => ({ ...s, fallbackKey: e.target.value }))
                }
              />
              <div className="daily-actions" style={{ marginTop: 12 }}>
                <Button variant="accent" size="sm" onClick={saveSettings}>
                  Save
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={test}
                  loading={busy}
                  disabled={busy}
                >
                  Test
                </Button>
              </div>
              <p className="taste-footnote">
                Keys stay in this browser (anime_nexus_ai_settings). Chat streams
                when the provider supports SSE.
              </p>
            </div>
          ) : null}

          <div className="ai-messages">
            {messages.length === 0 ? (
              <p className="taste-footnote">
                Ask anything anime — Lantern uses local memory of titles you
                open. Press A anytime.
              </p>
            ) : (
              messages.map((m, i) => (
                <div key={i} className={"ai-msg " + m.role}>
                  {m.content || (busy && m.role === "assistant" ? "…" : "")}
                </div>
              ))
            )}
          </div>

          <div className="ai-quick">
            {QUICK.map((q) => (
              <Button
                key={q}
                variant="outline"
                size="sm"
                onClick={() => send(q)}
                disabled={busy}
              >
                {q}
              </Button>
            ))}
          </div>

          <div className="ai-compose">
            <textarea
              className="notes-area"
              rows={2}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Message the desk…"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send(input);
                }
              }}
            />
            <Button
              variant="accent"
              size="sm"
              disabled={busy}
              loading={busy}
              onClick={() => send(input)}
            >
              Send
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
