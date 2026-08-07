"use client";

import { useEffect, useRef, useState } from "react";
import {
  addConfession,
  countBingoWins,
  markedCount,
  newBingo,
  readBingo,
  readConfessions,
  toggleBingo,
  type BingoBoard,
  type Confession,
} from "@/lib/fanzone";
import {
  buildTasteDNA,
  parseTasteDNA,
  compareSoulmates,
} from "@/lib/taste-dna";
import { useWatchlist } from "@/components/WatchlistProvider";
import { useToast } from "@/components/ToastProvider";
import { isAIConfigured } from "@/lib/ai-settings";
import { callChatCompletions } from "@/lib/ai-chat";
import { Button } from "@/components/ui/Button";
import { fireSeal } from "@/components/SealMoment";
import { fireConfetti } from "@/components/ConfettiBurst";

export function FanzoneClient() {
  const { entries } = useWatchlist();
  const { showToast } = useToast();
  const [confessions, setConfessions] = useState<Confession[]>([]);
  const [text, setText] = useState("");
  const [bingo, setBingo] = useState<BingoBoard | null>(null);
  const [importCode, setImportCode] = useState("");
  const [compareResult, setCompareResult] = useState<string | null>(null);
  const [freq, setFreq] = useState<string | null>(null);
  const [lastPct, setLastPct] = useState<number | null>(null);
  const prevWins = useRef(0);

  useEffect(() => {
    setConfessions(readConfessions());
    const b = readBingo() || newBingo();
    setBingo(b);
    prevWins.current = countBingoWins(b.marked);
  }, []);

  function submitConfess() {
    const next = addConfession(text);
    setConfessions(next);
    setText("");
    showToast("Confession logged", "💌");
  }

  function onToggleCell(i: number) {
    const next = toggleBingo(i);
    if (!next) return;
    setBingo(next);
    const wins = countBingoWins(next.marked);
    if (wins > prevWins.current) {
      prevWins.current = wins;
      fireSeal(
        wins === 1 ? "First bingo line" : `${wins} bingo lines`,
        "seal",
      );
      fireConfetti(1400);
      showToast(
        wins === 1 ? "Bingo!" : `${wins} lines complete`,
        "✦",
        true,
      );
    } else {
      prevWins.current = wins;
    }
  }

  function resetBoard() {
    const b = newBingo();
    setBingo(b);
    prevWins.current = countBingoWins(b.marked);
    showToast("Fresh board", "🎲");
  }

  async function exportDNA() {
    const code = buildTasteDNA(entries);
    try {
      await navigator.clipboard.writeText(code);
      showToast("Taste DNA copied", "🧬");
    } catch {
      prompt("Copy your Taste DNA:", code);
    }
  }

  function runCompare() {
    const other = parseTasteDNA(importCode);
    if (!other) {
      setCompareResult("Invalid code.");
      setLastPct(null);
      return;
    }
    const r = compareSoulmates(entries, other);
    setLastPct(r.pct);
    let label = "Distant stars";
    if (r.pct >= 75) label = "Anime soulmates";
    else if (r.pct >= 50) label = "Strong resonance";
    else if (r.pct >= 30) label = "Some overlap";
    setCompareResult(
      `${r.pct}% — ${label}. Shared genres: ${r.shared.join(", ") || "none"}.`,
    );
    setFreq(null);
  }

  async function frequencyRead() {
    if (lastPct == null || !compareResult) return;
    if (!isAIConfigured()) {
      showToast("Configure AI in the panel first", "🤖");
      return;
    }
    try {
      const reply = await callChatCompletions(
        [
          {
            role: "system",
            content:
              "You write a short poetic 'frequency read' about two anime fans. " +
              "You MUST treat the given percentage as ground truth. Never invent a different %. " +
              "2-4 sentences max. No unlock codes or ARG.",
          },
          {
            role: "user",
            content: `Computed overlap: ${lastPct}%. Context: ${compareResult}. Give the frequency read.`,
          },
        ],
        { temperature: 0.8 },
      );
      setFreq(reply.trim());
    } catch (e) {
      showToast(e instanceof Error ? e.message : "AI failed", "😅");
    }
  }

  const wins = bingo ? countBingoWins(bingo.marked) : 0;
  const marked = bingo ? markedCount(bingo.marked) : 0;

  return (
    <div className="tools-panel fanzone">
      <section className="fz-section">
        <h2>Confessions</h2>
        <div className="picker-row">
          <input
            className="filter-input"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Anonymous local note…"
            maxLength={280}
          />
          <Button variant="accent" size="sm" onClick={submitConfess}>
            Post
          </Button>
        </div>
        <ul className="confession-list">
          {confessions.map((c) => (
            <li key={c.id}>{c.text}</li>
          ))}
          {!confessions.length ? (
            <li className="tools-hint lantern-empty">
              The booth is empty. Leave a local note only this browser will see.
            </li>
          ) : null}
        </ul>
      </section>

      <section className="fz-section">
        <div className="bingo-head">
          <h2>Trope bingo</h2>
          <Button variant="outline" size="sm" onClick={resetBoard}>
            New board
          </Button>
        </div>
        <p className="bingo-help">
          Tap cells when a trope shows up. Center is free. Complete a row, column,
          or diagonal for bingo.
        </p>
        {bingo ? (
          <>
            <div className="bingo-progress" aria-live="polite">
              <span>
                <strong>{marked}</strong> / 25 marked
              </span>
              <span>
                <strong>{wins}</strong> line{wins === 1 ? "" : "s"}
              </span>
            </div>
            <div
              className="bingo-grid"
              role="grid"
              aria-label="Anime trope bingo board"
            >
              {bingo.cells.map((cell, i) => {
                const isFree = cell === "FREE";
                const markedCell = bingo.marked[i];
                return (
                  <button
                    key={`${cell}-${i}`}
                    type="button"
                    role="gridcell"
                    aria-pressed={markedCell}
                    disabled={isFree}
                    className={
                      "bingo-cell" +
                      (markedCell ? " marked" : "") +
                      (isFree ? " is-free" : "")
                    }
                    onClick={() => onToggleCell(i)}
                  >
                    <span className="bingo-cell-label">{cell}</span>
                  </button>
                );
              })}
            </div>
          </>
        ) : null}
      </section>

      <section className="fz-section">
        <h2>Taste DNA</h2>
        <div className="daily-actions">
          <Button variant="accent" size="sm" onClick={exportDNA}>
            Export my DNA
          </Button>
        </div>
        <label className="filter-label">Friend&apos;s code</label>
        <textarea
          className="filter-input"
          rows={3}
          value={importCode}
          onChange={(e) => setImportCode(e.target.value)}
          placeholder="Paste Taste DNA…"
        />
        <Button
          variant="outline"
          size="sm"
          style={{ marginTop: 8 }}
          onClick={runCompare}
        >
          Compare
        </Button>
        {compareResult ? (
          <p className="tools-hint" style={{ marginTop: 12 }}>
            {compareResult}
          </p>
        ) : null}
        {lastPct != null ? (
          <Button
            variant="outline"
            size="sm"
            style={{ marginTop: 8 }}
            onClick={frequencyRead}
          >
            Frequency read (AI)
          </Button>
        ) : null}
        {freq ? (
          <p className="oracle-cloud" style={{ marginTop: 12 }}>
            {freq}
          </p>
        ) : null}
      </section>
    </div>
  );
}
