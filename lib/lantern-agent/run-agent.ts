/**
 * Lantern agent runner (Sprint 5 + 12–13 + 23 polish).
 *
 * Flow:
 * 1) Model proposes tools as JSON (or none).
 * 2) Tools execute for real; failures are returned honestly.
 * 3) Model answers only from tool results + memory — no invented lists.
 */

import { callChatCompletions, type ChatMessage } from "@/lib/ai-chat";
import { memoryDigestForAI } from "@/lib/lantern-memory";
import { fetchAnimeById } from "@/lib/anilist";
import { readWatchlist } from "@/lib/watchlist-storage";
import {
  executeTool,
  toolsCatalogForPrompt,
  type ToolName,
  type ToolResult,
} from "./tools";

export type AgentPendingAction = {
  tool: ToolName;
  args: Record<string, unknown>;
  message: string;
};

export type AgentRunResult = {
  reply: string;
  toolResults: ToolResult[];
  pendingActions: AgentPendingAction[];
};

type ToolCallPlan = {
  tools?: { name: string; args?: Record<string, unknown> }[];
  answerDirectly?: boolean;
};

function plannerSystem(): string {
  return [
    "You are Lantern's planner for AnimeNexus.",
    "Decide which tools (if any) are needed to answer the user.",
    "Respond with ONLY valid JSON, no markdown:",
    '{"tools":[{"name":"toolName","args":{...}}],"answerDirectly":false}',
    'or {"tools":[],"answerDirectly":true} for pure chat.',
    "Available tools:",
    toolsCatalogForPrompt(),
    "Rules:",
    "- MUST call getWatchlist for questions about their list, watching, planning, or 'what should I watch from my list'.",
    "- MUST call getCompletionQueue for 'what should I finish', 'what to complete next', backlog / queue prioritization.",
    "- MUST call getTasteProfile or getStats for taste/stats questions.",
    "- MUST call searchAnime when the user names a title to look up.",
    "- MUST call getRecommendations for 'recommend something' when not pure chat.",
    "- Use getRecentActivity for 'what was I looking at'.",
    "- answerDirectly:true only for greetings, meta questions about Lantern, or when no data is needed.",
    "- Never invent anime titles or watchlist contents.",
    "- Max 3 tools; prefer 1–2 precise tools over many.",
  ].join("\n");
}

function answerSystem(toolBlock: string): string {
  return [
    "You are Lantern — host of AnimeNexus, not a generic chatbot.",
    "Speak warm, concise, anime-literate.",
    "You MUST treat TOOL_RESULTS as ground truth.",
    "If a tool failed or returned empty, say so honestly. Never invent titles or claim you modified the list unless a tool confirmed it.",
    "If a tool needs confirmation, tell the user what would happen and that they must confirm in the UI.",
    "When recommending, prefer the tool's confidence + reasons; do not invent match percentages.",
    "No fake ARG codes.",
    "",
    "Local memory digest:",
    memoryDigestForAI(),
    "",
    "TOOL_RESULTS:",
    toolBlock || "(no tools were run)",
  ].join("\n");
}

function parsePlan(raw: string): ToolCallPlan {
  const trimmed = raw.trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start < 0 || end <= start) return { tools: [], answerDirectly: true };
  try {
    return JSON.parse(trimmed.slice(start, end + 1)) as ToolCallPlan;
  } catch {
    return { tools: [], answerDirectly: true };
  }
}

const ALLOWED = new Set<string>([
  "searchAnime",
  "getAnimeDetails",
  "getWatchlist",
  "getTasteProfile",
  "getStats",
  "getRecentActivity",
  "getRecommendations",
  "getCompletionQueue",
  "addToWatchlist",
  "removeFromWatchlist",
]);

async function titleForAnimeId(id: number): Promise<string | null> {
  try {
    const local = readWatchlist().find((e) => e.id === id);
    if (local) return local.title;
    const anime = await fetchAnimeById(id);
    return anime?.title ?? null;
  } catch {
    return null;
  }
}

export async function runLanternAgent(
  userMessage: string,
  prior: ChatMessage[] = [],
): Promise<AgentRunResult> {
  const planRaw = await callChatCompletions(
    [
      { role: "system", content: plannerSystem() },
      ...prior.slice(-6),
      { role: "user", content: userMessage },
    ],
    { temperature: 0.15 },
  );

  const plan = parsePlan(planRaw);
  const calls = (plan.tools || []).slice(0, 3);
  const toolResults: ToolResult[] = [];
  const pendingActions: AgentPendingAction[] = [];

  for (const call of calls) {
    const name = String(call.name || "");
    if (!ALLOWED.has(name)) {
      toolResults.push({
        ok: false,
        tool: name as ToolName,
        error: `Tool not allowed: ${name}`,
      });
      continue;
    }
    const result = await executeTool(name as ToolName, call.args || {}, {
      confirmed: false,
    });
    toolResults.push(result);
    if (
      !result.ok &&
      "needsConfirmation" in result &&
      result.needsConfirmation
    ) {
      const args =
        (result.proposed as Record<string, unknown>) || call.args || {};
      const id = Number(args.animeId);
      let message =
        name === "addToWatchlist"
          ? "Lantern wants to add a title to your watchlist."
          : "Lantern wants to change your watchlist.";
      if (Number.isFinite(id)) {
        const title = await titleForAnimeId(id);
        if (title) {
          message =
            name === "addToWatchlist"
              ? `Add “${title}” to your watchlist?`
              : `Remove “${title}” from your watchlist?`;
        }
      }
      pendingActions.push({
        tool: name as ToolName,
        args,
        message,
      });
    }
  }

  const toolBlock = JSON.stringify(toolResults, null, 2);
  const reply = await callChatCompletions(
    [
      { role: "system", content: answerSystem(toolBlock) },
      ...prior.slice(-6),
      { role: "user", content: userMessage },
    ],
    { temperature: 0.7 },
  );

  return { reply, toolResults, pendingActions };
}
