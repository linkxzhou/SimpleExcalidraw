import { jsonrepair } from "jsonrepair";
import { getLanguage } from "../i18n";

export type AISettings = {
  language?: string;
  api?: string;
  secret?: string;
  model?: string;
  prompt?: string;
};

const AI_SETTINGS_STORAGE_KEY = "simpleexcalidraw_ai_settings";

export function loadAISettings(): AISettings {
  const envDefaults: AISettings = {
    api: (process.env.REACT_APP_AI_API || "").trim() || undefined,
    secret: (process.env.REACT_APP_AI_SECRET || "").trim() || undefined,
    model: (process.env.REACT_APP_AI_MODEL || "").trim() || undefined,
  };

  try {
    const raw = localStorage.getItem(AI_SETTINGS_STORAGE_KEY);
    const saved = raw ? JSON.parse(raw) : {};
    return { ...envDefaults, ...saved };
  } catch (e) {
    console.error("loadAISettings error: ", e);
    return envDefaults;
  }
}

export function saveAISettings(settings: AISettings) {
  try {
    localStorage.setItem(AI_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error("saveAISettings error: ", e);
  }
}

type RequestCompletionsParams = {
  api: string;
  secret?: string;
  model?: string;
  temperature?: number;
  prompt: string;
  signal?: AbortSignal;
};

function resolveEndpoint(api: string): string {
  if (!api) {
    throw new Error("API endpoint is required");
  }
  const trimmed = api.trim();
  if (
    trimmed.endsWith("/chat/completions") ||
    trimmed.endsWith("/completions")
  ) {
    return trimmed;
  }
  if (/\/v1\/?$/.test(trimmed)) {
    return `${trimmed.replace(/\/$/, "")}/chat/completions`;
  }
  return trimmed;
}

function normalizeSecret(secret?: string): string {
  if (!secret) {
    return "";
  }
  const s = String(secret).trim();
  if (s.startsWith("my-")) {
    const encoded = s.slice(3).replace(/\s+/g, "");
    const urlsafe = encoded.replace(/-/g, "+").replace(/_/g, "/");
    const padded = urlsafe + "=".repeat((4 - (urlsafe.length % 4)) % 4);
    try {
      if (typeof atob === "function") {
        return atob(padded);
      }
      if (typeof Buffer !== "undefined") {
        return Buffer.from(padded, "base64").toString("utf-8");
      }
    } catch (e) {
      return s;
    }
  }
  return s;
}

function safeParseJson(input: string): any {
  try {
    const repaired = jsonrepair(input);
    return JSON.parse(repaired);
  } catch {
    const fenced =
      input.match(/```json\s*([\s\S]*?)```/i) ||
      input.match(/```([\s\S]*?)```/);
    if (fenced) {
      try {
        const repaired = jsonrepair(fenced[1]);
        return JSON.parse(repaired);
      } catch {}
    }
    const startObj = input.indexOf("{");
    const endObj = input.lastIndexOf("}");
    if (startObj !== -1 && endObj !== -1 && endObj > startObj) {
      try {
        const repaired = jsonrepair(input.slice(startObj, endObj + 1));
        return JSON.parse(repaired);
      } catch {}
    }
    const startArr = input.indexOf("[");
    const endArr = input.lastIndexOf("]");
    if (startArr !== -1 && endArr !== -1 && endArr > startArr) {
      try {
        const repaired = jsonrepair(input.slice(startArr, endArr + 1));
        return JSON.parse(repaired);
      } catch {}
    }
    return null;
  }
}

function extractIdeas(data: any): any {
  try {
    if (typeof data === "string") {
      return safeParseJson(data);
    }
    if (data && typeof data === "object") {
      const content =
        data?.choices?.[0]?.message?.content ??
        data?.choices?.[0]?.delta?.content ??
        data?.message?.content ??
        null;

      if (typeof content === "string") {
        return content;
      }

      return data;
    }
  } catch (err) {
    console.warn("Failed to extract ideas", err);
    throw err;
  }

  return null;
}

export async function requestCompletions({
  api,
  secret,
  model = "gpt-5",
  temperature = 0.7,
  prompt,
  signal,
}: RequestCompletionsParams) {
  const endpoint = resolveEndpoint(api);
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const authSecret = normalizeSecret(secret);
  if (authSecret) {
    headers.Authorization = `Bearer ${authSecret}`;
  }

  if (!prompt || prompt.trim() === "" || !model || endpoint.trim() === "") {
    throw new Error("Prompt, model, and endpoint are required");
  }

  const body = {
    model,
    messages: [{ role: "user", content: prompt }],
    temperature,
    max_tokens: 32000,
    enable_thinking: false,
  };

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal,
    });
    const isJson = (res.headers.get("content-type") || "").includes(
      "application/json",
    );
    const data = isJson ? await res.json() : await res.text();
    const ideas = extractIdeas(data);
    console.log("AI response", data, ideas);
    return { data, ideas, isJson, endpoint };
  } catch (err) {
    console.error("AI request failed", err);
    throw err;
  }
}

function extractContent(data: any): string | null {
  if (typeof data === "string") {
    return data;
  }
  if (data && typeof data === "object") {
    const content =
      data?.choices?.[0]?.message?.content ??
      data?.choices?.[0]?.delta?.content ??
      data?.message?.content ??
      null;
    return typeof content === "string" ? content : null;
  }
  return null;
}

export async function requestTextCompletions(params: RequestCompletionsParams) {
  const { data, isJson, endpoint } = await requestCompletions(params);
  const content = extractContent(data);
  if (!content) {
    throw new Error("Failed to extract AI response content");
  }
  return { data, content, isJson, endpoint };
}

export function buildExtendPrompt(prompt: string, settings: AISettings = {}) {
  const language = settings.language || getLanguage()?.label;
  const raw = (prompt || "").trim();

  return `You will be given a user's raw input. First, expand it into a clear, structured architecture specification that can be converted into a Mermaid diagram.

## Output (for the next step)
Produce a concise but complete spec with these sections (use the same headings):
- Title
- Scope
- Actors (if any)
- Main Modules (3-10)
- Submodules (for each module)
- Data/Control Flows (arrows): SOURCE -> TARGET : label
- Notes / Constraints (important layout or grouping hints)
- OutputLanguage: ${language}

## Naming Rules
- Use stable, Mermaid-safe IDs for modules/submodules: only letters/numbers/underscore (e.g. Auth, User_Service, DB).
- When you introduce a module/submodule, include both: ID (Mermaid-safe) and Label (human-readable, ${language}).
- Every flow MUST use the IDs that exist in your spec.

## General Rules
- Infer missing details when the user input is vague.
- Prefer fewer, clearer modules over many tiny ones.
- Keep flow labels short (1-6 words).

## UserInput
${raw}`;
}

export function buildExcalidrawPrompt(
  prompt: string,
  settings: AISettings = {},
) {
  const language = settings.language || getLanguage()?.label;
  return `## Role
You are an expert in Mermaid diagramming. Convert the input Task into ONE Mermaid diagram that best matches the content.

## Output (STRICT)
- Output ONLY Mermaid code text.
- Do NOT wrap it in markdown code fences.
- Choose exactly ONE diagram type.
- Start with exactly ONE of:
  - flowchart LR
  - sequenceDiagram
  - classDiagram
- Do NOT mix multiple diagram types in one output.

## Diagram Selection Rules
- Use flowchart LR for architecture/modules/components and their connections.
- Use sequenceDiagram for time-ordered interactions/messages between actors/services.
- Use classDiagram for domain/data model (entities/classes) and relationships.

## Mermaid Conventions (by type)
- Common:
  - Use Mermaid-safe IDs when applicable (letters/numbers/underscore only).
  - Use human-readable labels in ${language}.
  - Avoid features that often break parsing/rendering: HTML labels, \`click\`, emojis.

- flowchart LR:
  - Prefer subgraphs for Main Modules, and nodes inside for Submodules.
    - Example node: Auth["Auth Service"]
    - Example subgraph:
      subgraph AuthModule["Auth"]
        Auth
        TokenStore["Token Store"]
      end
  - Use directed edges with short labels:
    - Auth -->|"issue token"| TokenStore
  - Add node background colors using Mermaid styling (prefer \`classDef\` + \`class\`).
    - Assign a consistent, light fill color per Main Module; apply the same color to its Submodules.
    - Example:
      - classDef auth fill:#E3F2FD,stroke:#1E88E5,color:#0D47A1;
      - class Auth,TokenStore auth;

- sequenceDiagram:
  - Use \`actor\`/\`participant\` with clear names (human-readable labels in ${language}).
  - Use concise messages with arrows (e.g. A->>B: label).
  - Do NOT add background colors/styles unless you are 100% sure the syntax is valid for sequenceDiagram.

- classDiagram:
  - Use class names as Mermaid-safe IDs; keep members minimal (only if needed).
  - Use simple relationship arrows with short labels.
  - If you add colors, use Mermaid styling (\`classDef\` + \`class\`) and keep it minimal.
  - IMPORTANT: When using \`class\` to assign a style, you MUST put exactly ONE class per line.
    - Correct:
      - class NginxCore core
      - class EventModule module
      - class Connection data
    - Incorrect (do not do this):
      - class EventModule,HTTPModule,UpstreamModule,ConfigModule module
      - class Connection,Event,Request,Response,MemoryPool data

## Layout / Readability Rules
- Keep it 3-10 main modules total when using flowchart LR.
- Keep labels short (1-6 words) and avoid markdown formatting.

## Task
<context>
${prompt}
</context>
`;
}
