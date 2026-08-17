/**
 * Lantern agent runner (Sprint 5).
 *
 * Flow:
 * 1) Model proposes tools as JSON (or none).
 * 2) Tools execute for real; failures are returned honestly.
 * 3) Model answers only from tool results + memory — no invented lists.
 */

import { callChatCompletions, type ChatMessage } from "@/lib/ai-chat";
import { memoryDigestForAI } from "@/lib/lantern-memory";
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
    "or {\"tools\":[],\"answerDirectly\":true} for pure chat.",
    "Available tools:",
    toolsCatalogForPrompt(),
    "Rules:",
    "- Prefer tools for watchlist, taste, stats, search, recommendations.",
    "- Never invent anime titles or watchlist contents.",
    "- Max 3 tools.",
  ].join("\n");
}

function answerSystem(toolBlock: string): string {
  return [
    "You are Lantern — host of AnimeNexus, not a generic chatbot.",
    "Speak warm, concise, anime-literate.",
    "You MUST treat TOOL_RESULTS as ground truth.",
    "If a tool failed or returned empty, say so honestly. Never invent titles or claim you modified the list unless a tool confirmed it.",
    "If a tool needs confirmation, tell the user what would happen and that they must confirm in the UI.",
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
  "addToWatchlist",
  "removeFromWatchlist",
]);

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
    { temperature: 0.2 },
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
    const result = await executeTool(
      name as ToolName,
      call.args || {},
      { confirmed: false },
    );
    toolResults.push(result);
    if (
      !result.ok &&
      "needsConfirmation" in result &&
      result.needsConfirmation
    ) {
      pendingActions.push({
        tool: name as ToolName,
        args: (result.proposed as Record<string, unknown>) || call.args || {},
        message:
          name === "addToWatchlist"
            ? "Lantern wants to add a title to your watchlist."
            : "Lantern wants to change your watchlist.",
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
