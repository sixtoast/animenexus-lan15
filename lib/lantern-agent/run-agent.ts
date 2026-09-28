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
import {
  readIntentSession,
  readAiIntentOverlay,
} from "@/lib/intent-session";
import { getExperienceIntent } from "@/lib/viewing-intent";

export type AgentPendingAction = {
  tool: ToolName;
  args: Record<string, unknown>;
  message: string;
};

export type AgentWebSource = {
  title: string;
  url: string;
  snippet?: string;
  publishedDate?: string | null;
};

export type AgentRunResult = {
  reply: string;
  toolResults: ToolResult[];
  webSources: AgentWebSource[];
  pendingActions: AgentPendingAction[];
};

type ToolCallPlan = {
  tools?: { name: string; args?: Record<string, unknown> }[];
  answerDirectly?: boolean;
};

function viewingIntentDigest(): string {
  try {
    const session = readIntentSession();
    const overlay = readAiIntentOverlay();
    const slug = session.slug || overlay?.structured?.intent || null;
    const exp = slug ? getExperienceIntent(slug) : undefined;
    const lines: string[] = [];
    if (exp) {
      lines.push(
        `Active experience: ${exp.emoji} ${exp.label} (${exp.slug}) \u2014 ${exp.blurb}`,
      );
    } else if (slug) {
      lines.push(`Intent slug: ${slug}`);
    } else {
      lines.push(
        "No named mood selected yet (user may still describe one in chat).",
      );
    }
    lines.push(
      `Session dials: intensity=${session.intensity}, energy=${session.energy}, attention=${session.attention}` +
        (session.minutesAvailable != null
          ? `, minutes=${session.minutesAvailable}`
          : ""),
    );
    if (overlay?.freeText) {
      lines.push(`Free-text night request: "${overlay.freeText.slice(0, 280)}"`);
    }
    if (overlay?.structured?.paraphrase) {
      lines.push(`Interpreted as: ${overlay.structured.paraphrase}`);
    }
    const hard = overlay?.structured?.hardAvoid || [];
    const soft = overlay?.structured?.avoid || [];
    if (hard.length) lines.push(`Hard avoids: ${hard.join(", ")}`);
    if (soft.length) lines.push(`Soft avoids: ${soft.join(", ")}`);
    lines.push(
      "Viewing intent for tonight outranks broad lifetime genre taste when recommending.",
    );
    return lines.join("\n");
  } catch {
    return "Viewing intent unavailable.";
  }
}


function spoilerBoundaryDigest(): string {
  try {
    const entries = readWatchlist();
    if (!entries.length) return "No recorded watch progress. If a question could reveal plot details, avoid major spoilers unless the user explicitly asks for them.";
    return entries.slice(0, 30).map((e) => {
      const status = e.watchStatus || "unknown";
      const progress = e.progress != null ? ` episode/chapter progress=${e.progress}` : "";
      return `- ${e.title}: status=${status}${progress}`;
    }).join("\n");
  } catch {
    return "Watch progress unavailable. Avoid major spoilers unless explicitly requested.";
  }
}

function plannerSystem(): string {
  return [
    "You are Lantern's planner for AnimeNexus.",
    "Decide which tools (if any) are needed to answer the user.",
    "Respond with ONLY valid JSON, no markdown:",
    '{"tools":[{"name":"toolName","args":{...}}],"answerDirectly":false}',
    'or {"tools":[],"answerDirectly":true} for pure chat.',
    "CURRENT VIEWING INTENT (authoritative for tonight):",
    viewingIntentDigest(),
    "RECORDED SPOILER BOUNDARIES:",
    spoilerBoundaryDigest(),
    "Available tools:",
    toolsCatalogForPrompt(),
    "Rules:",
    "- MUST call getViewingIntent when the user talks about mood, tonight, how they want to feel, energy, or 'something depressing/chill/intense'.",
    "- MUST call getWatchlist for questions about their list, watching, planning, or 'what should I watch from my list'.",
    "- MUST call getCompletionQueue for 'what should I finish', 'what to complete next', backlog / queue prioritization.",
    "- MUST call getTasteProfile or getStats for taste/stats questions.",
    "- MUST call searchAnime when the user names a title to look up.",
    "- Use searchWeb for general factual questions, current information, interviews, episode/chapter context, production details, character facts, narrative details, or shared-universe/canon/crossover questions that may not exist in AniList/AnimeNexus.",
    "- For shared-universe, same-world, crossover, canon connection, or Easter-egg questions involving named anime, MUST use searchWeb; searchAnime may be added for catalogue context but must not replace web research.",
    "- For anime questions where catalogue data may be incomplete, prefer searchAnime + searchWeb together when both add distinct information.",
    "- Pass a concise context and spoilerBoundary to searchWeb. Never ask the web search tool for unrestricted spoilers when the user's watch progress is known.",
    "- For current/recent facts, web research is preferred over memory.",
    "- MUST call getRecommendations for 'recommend something' / 'what should I watch' when not pure chat. Prefer pairing with getViewingIntent.",
    "- When recommending, respect hard avoids from viewing intent; current intent outranks long-term genre habits.",
    "- Use getRecentActivity for 'what was I looking at'.",
    "- answerDirectly:true only for greetings, meta questions about Lantern, or when no data is needed.",
    "- Never invent anime titles or watchlist contents.",
    "- Max 3 tools; prefer 1\u20132 precise tools over many.",
  ].join("\n");
}

function answerSystem(toolBlock: string): string {
  return [
    "You are Lantern \u2014 host of AnimeNexus, not a generic chatbot.",
    "Speak warm, concise, anime-literate.",
    "CURRENT VIEWING INTENT:",
    viewingIntentDigest(),
    "Steer picks toward the requested experience; do not default to their usual action/fantasy diet if tonight asks for something else.",
    "You MUST treat TOOL_RESULTS as ground truth for catalogue/user data, but treat web snippets as sourced evidence that may be incomplete or stale.",
    "When web research was used, distinguish researched facts from inference and include a compact Sources section with the relevant source titles and URLs.",
    "FINAL ANSWER OUTPUT MUST BE PLAIN USER-FACING TEXT. NEVER emit, repeat, or simulate tool calls, XML tool tags, ChatML tool tags, JSON tool plans, or <arg_key>/<arg_value> blocks. Tools have already been executed by the agent runner.",
    "Never invent citations or URLs. Only cite URLs returned by searchWeb.",
    "Respect spoiler boundaries. Never reveal plot information beyond the user's recorded progress unless the user explicitly asks for spoilers. If progress is unknown, prefer spoiler-light answers and say that the boundary is unknown.",
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
  if (start >= 0 && end > start) {
    try {
      return JSON.parse(trimmed.slice(start, end + 1)) as ToolCallPlan;
    } catch {
      // Some OpenAI-compatible models ignore the JSON-only instruction and emit
      // their own XML-ish tool-call format. Parse that format as a compatibility
      // fallback instead of leaking the raw tool call to the user.
    }
  }

  const calls: { name: string; args: Record<string, unknown> }[] = [];
  const callRe = /<tool_call>\s*([A-Za-z0-9_-]+)\s*([\s\S]*?)<\/tool_call>/gi;
  let match: RegExpExecArray | null;
  while ((match = callRe.exec(trimmed))) {
    const name = match[1];
    const body = match[2];
    const args: Record<string, unknown> = {};
        const argRe = /<arg_key>\s*([^<]+?)\s*<\/arg_key>\s*<arg_value>\s*([\s\S]*?)\s*<\/arg_value>/gi;
    let arg: RegExpExecArray | null;
    while ((arg = argRe.exec(body))) {
      args[arg[1].trim()] = arg[2].trim();
    }
    calls.push({ name, args });
  }

  if (calls.length) return { tools: calls, answerDirectly: false };

  // Compatibility with models that emit ChatML-style tool calls instead of the
  // JSON/XML formats above, e.g.:
  // <|tool_call_start|>[searchWeb(query='...'), searchWeb(query='...')]<|tool_call_end|>
  // Some OpenAI-compatible/free-router models do this even when asked for JSON.
  const chatMlMatch = trimmed.match(
    /<\|tool_call_start\|>\s*\[([\s\S]*?)\]\s*<\|tool_call_end\|>/i,
  );
  if (chatMlMatch) {
    const body = chatMlMatch[1];
  const chatMlRe = /([A-Za-z0-9_-]+)\s*\(([^)]*)\)/g;
    let toolMatch: RegExpExecArray | null;
    while ((toolMatch = chatMlRe.exec(body))) {
      const name = toolMatch[1];
      const args: Record<string, unknown> = {};
      const argBody = toolMatch[2];
      const argRe = /([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(?:'([^']*)'|"([^"]*)"|([^,]+))/g;
      let argMatch: RegExpExecArray | null;
      while ((argMatch = argRe.exec(argBody))) {
        const raw = argMatch[2] ?? argMatch[3] ?? argMatch[4]?.trim() ?? "";
        args[argMatch[1]] = raw;
      }
      calls.push({ name, args });
      if (calls.length >= 3) break;
    }
    if (calls.length) return { tools: calls, answerDirectly: false };
  }

  return { tools: [], answerDirectly: true };
}

const ALLOWED = new Set<string>([
  "searchAnime",
  "searchWeb",
  "getAnimeDetails",
  "getWatchlist",
  "getTasteProfile",
  "getStats",
  "getRecentActivity",
  "getRecommendations",
  "getViewingIntent",
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
              ? `Add \u201c${title}\u201d to your watchlist?`
              : `Remove \u201c${title}\u201d from your watchlist?`;
        }
      }
      pendingActions.push({
        tool: name as ToolName,
        args,
        message,
      });
    }
  }

  const webSources = toolResults.flatMap((r) => {
    if (!r.ok || r.tool !== "searchWeb") return [];
    const data = r.data as { sources?: AgentWebSource[] };
    return Array.isArray(data?.sources) ? data.sources : [];
  }).filter((s, i, all) => s?.url && all.findIndex((x) => x.url === s.url) === i).slice(0, 8);

  const toolBlock = JSON.stringify(toolResults, null, 2);
  const rawReply = await callChatCompletions(
    [
      { role: "system", content: answerSystem(toolBlock) },
      ...prior.slice(-6),
      { role: "user", content: userMessage },
    ],
    { temperature: 0.7 },
  );

  // A few OpenAI-compatible models can still emit a tool-call-shaped response
  // during the final answer pass even though tools have already executed.
  // Never expose that protocol to the user.
  const reply = rawReply
    .replace(/<tool_call>[\s\S]*?<\/tool_call>/gi, "")
    .replace(/<\|tool_call_start\|>[\s\S]*?<\|tool_call_end\|>/gi, "")
    .replace(/<arg_key>[\s\S]*?<\/arg_value>/gi, "")
    .trim();

  return { reply, toolResults, pendingActions, webSources };
}
