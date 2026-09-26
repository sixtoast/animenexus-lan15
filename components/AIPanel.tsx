"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import {
  AI_PRESETS,
  defaultSettings,
  isAIConfigured,
  readAISettings,
  writeAISettings,
  type AIProviderId,
  type AISettings,
} from "@/lib/ai-settings";
import { testAIConnection } from "@/lib/ai-chat";
import { runLanternAgent } from "@/lib/lantern-agent/run-agent";
import { executeTool, type ToolName } from "@/lib/lantern-agent/tools";
import { setMascotConversationState } from "@/lib/mascot/conversation-state";
import { useWatchlist } from "@/components/WatchlistProvider";
import { useToast } from "@/components/ToastProvider";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { emitNexusSignal } from "@/lib/nexus-intelligence";

type Msg = { role: "user" | "assistant" | "system"; content: string };

const QUICK = [
  "Tune Discovery to my mood",
  "Find the next title for me",
  "Explore this anime universe",
];

const INTELLIGENCE = [
  { label: "DISCOVER", target: "discovery" as const },
  { label: "RECOMMEND", target: "recommendations" as const },
  { label: "MOOD", target: "mood" as const },
  { label: "WATCH ORDER", target: "watch-order" as const },
  { label: "FRANCHISE", target: "franchise" as const },
];

export function AIPanel() {
  const [open, setOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settings, setSettings] = useState<AISettings>(defaultSettings());
  const [configured, setConfigured] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [pending, setPending] = useState<
    { tool: string; args: Record<string, unknown>; message: string }[]
  >([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [composerFocused, setComposerFocused] = useState(false);
  const pathname = usePathname() || "/";
  const [nexusSignal, setNexusSignal] = useState("Listening to the current field");
  const speechTimer = useRef<number | null>(null);
  const { showToast } = useToast();
  const { add, remove } = useWatchlist();

  useEffect(() => {
    const s = readAISettings();
    setSettings(s);
    setConfigured(isAIConfigured(s));
  }, [open]);

  useEffect(() => {
    setMascotConversationState({ listening: open && composerFocused && !busy });
  }, [open, composerFocused, busy]);

  useEffect(() => () => {
    if (speechTimer.current) window.clearTimeout(speechTimer.current);
    setMascotConversationState({ listening: false, thinking: false, speaking: false });
  }, []);

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

  function emitNexusSignal(signal: string) {
    setNexusSignal(signal);
    window.dispatchEvent(new CustomEvent("nexus:intent", { detail: { signal, source: "lantern" } }));
  }

  function routeSignal(path: string) {
    if (path === "/") return "Discovery field is open";
    if (path.startsWith("/browse") || path.startsWith("/seasonal") || path.startsWith("/airing")) return "Catalogue field is expanded";
    if (path.startsWith("/anime/")) return "Title universe is centred";
    if (path.startsWith("/watchlist")) return "Personal constellation is active";
    if (path.startsWith("/mood")) return "Mood field is active";
    return "Nexus is observing this space";
  }

  useEffect(() => { setNexusSignal(routeSignal(pathname)); }, [pathname]);

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
    setMascotConversationState({ listening: false, thinking: true, speaking: false });
    try {
      const reply = await testAIConnection();
      setMessages((m) => [...m, { role: "assistant", content: reply }]);
      setConfigured(true);
      showToast("AI connected", "✅");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Test failed", "😅");
    } finally {
      setBusy(false);
      setMascotConversationState({ thinking: false });
    }
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
    setMessages([
      ...next,
      { role: "assistant", content: "Lantern is thinking…" },
    ]);
    setBusy(true);
    setMascotConversationState({ listening: false, thinking: true, speaking: false });
    try {
      const prior = next.slice(0, -1).map((m) => ({
        role: m.role as "user" | "assistant" | "system",
        content: m.content,
      }));
      const result = await runLanternAgent(v, prior);
      let reply = result.reply;
      const lower = reply.toLowerCase();
      const signal = lower.includes("watchlist") ? "Watchlist state identified" : lower.includes("mood") || lower.includes("psychological") || lower.includes("dark") ? "Mood field recalibrated" : lower.includes("franchise") ? "Franchise space mapped" : lower.includes("artwork") || lower.includes("poster") ? "Artwork space focused" : lower.includes("recommend") || lower.includes("watch") ? "Discovery field recalibrated" : "Nexus intelligence updated";
      emitNexusSignal(signal);
      if (result.pendingActions.length) {
        const lines = result.pendingActions
          .map((p) => `• ${p.message} (${p.tool})`)
          .join("\n");
        reply +=
          "\n\nPending actions (confirm below if you want them applied):\n" +
          lines;
        setPending(result.pendingActions);
      } else {
        setPending([]);
      }
      setMessages([...next, { role: "assistant", content: reply }]);
      setMascotConversationState({ thinking: false, speaking: true });
      if (speechTimer.current) window.clearTimeout(speechTimer.current);
      speechTimer.current = window.setTimeout(
        () => setMascotConversationState({ speaking: false }),
        Math.min(5200, 700 + reply.length * 18),
      );
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Chat failed", "😅");
      setMessages((m) =>
        m.filter(
          (x, i) =>
            !(
              i === m.length - 1 &&
              (x.content === "" || x.content === "Lantern is thinking…")
            ),
        ),
      );
      setMascotConversationState({ thinking: false, speaking: false });
    } finally {
      setBusy(false);
    }
  }

  async function confirmPending() {
    if (!pending.length) return;
    setBusy(true);
    setMascotConversationState({ listening: false, thinking: true, speaking: false });
    try {
      for (const p of pending) {
        const confirmed = await executeTool(p.tool as ToolName, p.args, {
          confirmed: true,
        });
        if (!confirmed.ok) {
          showToast(confirmed.error, "😅");
          continue;
        }
        if (p.tool === "addToWatchlist") {
          const id = Number(p.args.animeId);
          const { fetchAnimeById } = await import("@/lib/anilist");
          const anime = await fetchAnimeById(id);
          if (!anime) {
            showToast("Could not load anime to add", "😅");
            continue;
          }
          const status =
            p.args.status === "watching" ? "watching" : "planning";
          add(anime, status);
          showToast(`Added “${anime.title}”`, "✦");
        } else if (p.tool === "removeFromWatchlist") {
          remove(Number(p.args.animeId));
          showToast("Removed from watchlist", "✦");
        }
      }
      setPending([]);
    } finally {
      setBusy(false);
      setMascotConversationState({ thinking: false });
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
          <div className="ai-intelligence-banner">
            <span className="ai-intelligence-kicker">NEXUS INTELLIGENCE</span>
            <strong>Operate the field.</strong>
            <p>Lantern can steer discovery, taste, watch order and your constellation instead of only answering questions.</p>
            <div className="ai-intelligence-actions">
              {INTELLIGENCE.map((item) => (
                <button key={item.target} type="button" onClick={() => emitNexusSignal({ type: "focus", target: item.target })}>
                  {item.label}<span>↗</span>
                </button>
              ))}
            </div>
          </div>
          <div className="ai-intelligence-header">
            <div>
              <span className="ai-intelligence-kicker">NEXUS INTELLIGENCE</span>
              <strong>{nexusSignal}</strong>
            </div>
            <span className="ai-intelligence-pulse" aria-hidden="true" />
          </div>

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
                Keys stay in this browser (anime_nexus_ai_settings). Chat uses
                tools for watchlist, taste, search, and recommendations.
              </p>
            </div>
          ) : null}

          <div className="ai-messages">
            {messages.length === 0 ? (
              <p className="taste-footnote">
                The Nexus is listening to context, taste and intent. Ask Lantern to change the field, not just answer you.
                Press A anytime.
              </p>
            ) : (
              messages.map((m, i) => (
                <div key={i} className={"ai-msg " + m.role}>
                  {m.content || (busy && m.role === "assistant" ? "…" : "")}
                </div>
              ))
            )}
          </div>

          {pending.length > 0 ? (
            <div className="daily-actions" style={{ margin: "8px 0" }}>
              <Button
                variant="accent"
                size="sm"
                disabled={busy}
                onClick={() => void confirmPending()}
              >
                Confirm watchlist change
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={busy}
                onClick={() => setPending([])}
              >
                Dismiss
              </Button>
            </div>
          ) : null}

          <div className="ai-quick">
            {QUICK.map((q) => (
              <Button
                key={q}
                variant="outline"
                size="sm"
                onClick={() => void send(q)}
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
              onFocus={() => setComposerFocused(true)}
              onBlur={() => setComposerFocused(false)}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Message the desk…"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send(input);
                }
              }}
            />
            <Button
              variant="accent"
              size="sm"
              disabled={busy}
              loading={busy}
              onClick={() => void send(input)}
            >
              Send
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
