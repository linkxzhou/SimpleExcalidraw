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
        const parsed = safeParseJson(content);
        if (parsed !== null) {
          return parsed;
        }
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
  const requestPrompt = buildPrompt(prompt);

  if (
    !requestPrompt ||
    requestPrompt.trim() === "" ||
    !model ||
    endpoint.trim() === ""
  ) {
    throw new Error("Prompt, model, and endpoint are required");
  }

  const body = {
    model,
    messages: [{ role: "user", content: requestPrompt }],
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

export function buildPrompt(prompt: string, settings: AISettings = {}) {
  const language = getLanguage()?.label;
  return `## Role
You are an expert in \`excalidraw\`, skilled at breaking down input "Tasks" and generating JSON data for \`excalidraw\` architecture diagrams.

## Output Examples
<examples>
\`\`\`json
{
  "type": "excalidraw",                   // Document type identifier
  "version": 2,                           // Excalidraw version number
  "source": "amd-zen-architecture",       // Source identifier
  "elements": [                           // Array of drawing elements
    {
      "type": "text",                     // Element type: text/rectangle/ellipse/arrow/line, etc.
      "id": "title-text",                 // Unique element identifier
      "fillStyle": "solid",               // Fill style: solid/hachure/cross-hatch
      "strokeWidth": 2,                   // Stroke width
      "strokeStyle": "solid",             // Stroke style: solid/dashed/dotted
      "roughness": 1,                     // Hand-drawn roughness: 0-2
      "opacity": 100,                     // Opacity: 0-100
      "angle": 0,                         // Rotation angle (radians)
      "x": 420,                           // X coordinate
      "y": 40,                            // Y coordinate
      "strokeColor": "#1e1e1e",         // Stroke color
      "backgroundColor": "transparent",   // Background color
      "width": 280,                       // Width
      "height": 40,                       // Height
      "groupIds": [],                     // Array of group IDs
      "roundness": null,                  // Corner roundness, null or {type: 1-3}
      "boundElements": [],                // Array of bound elements
      "fontSize": 28,                     // Font size
      "fontFamily": 1,                    // Font family: 1-4
      "text": "AMD Zen CPU Architecture Overview",      // Text content
      "baseline": 30,                     // Baseline position
      "textAlign": "center",              // Horizontal alignment: left/center/right
      "verticalAlign": "top",             // Vertical alignment: top/middle/bottom
      "containerId": null,                // Container ID
      "originalText": "AMD Zen CPU Architecture Overview" // Original text
    },
    // ... other elements 
  ]
}
\`\`\`
</examples>
 
## Rules
Please strictly adhere to the following rules:
<rules>
- Output only JSON, no comments or other content.
- Break down the "Task" into modules, sub-modules, etc., ensuring detailed content.
- Adjust X and Y coordinates according to the actual situation, ensuring they do not exceed the drawing area, and consider the relationships between modules.
- Adjust width and height according to the content, ensuring they do not exceed the drawing area, and consider the relationships between modules.
- Consider the relationship between modules and sub-modules for containerId, ensuring sub-modules are within the correct container.
- Output language: ${language}
</rules>

## Task
<context>
${prompt}
</context>
`;
}
