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
    api: (process.env.REACT_AI_API || "").trim() || undefined,
    secret: (process.env.REACT_AI_SECRET || "").trim() || undefined,
    model: (process.env.REACT_AI_MODEL || "").trim() || undefined,
  };
  try {
    const raw = localStorage.getItem(AI_SETTINGS_STORAGE_KEY);
    const saved = raw ? JSON.parse(raw) : {};
    return { ...envDefaults, ...saved };
  } catch {
    return envDefaults;
  }
}

export function saveAISettings(settings: AISettings) {
  try {
    localStorage.setItem(AI_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch {}
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
  return `## Role (角色设定)   
你是一个精通的 \`excalidraw\` 专家，善于拆解输入的 ”Task (任务)“，生成 \`excalidraw\` 架构图的JSON数据。

## Output Examples (输出样例)
<examples>
\`\`\`json
{
  "type": "excalidraw",                   // 文档类型标识
  "version": 2,                           // Excalidraw版本号
  "source": "amd-zen-architecture",       // 来源标识
  "elements": [                           // 绘图元素数组
    {
      "type": "text",                     // 元素类型：text/rectangle/ellipse/arrow/line等
      "id": "title-text",                 // 元素唯一标识符
      "fillStyle": "solid",               // 填充样式：solid/hachure/cross-hatch
      "strokeWidth": 2,                   // 边框宽度
      "strokeStyle": "solid",             // 边框样式：solid/dashed/dotted
      "roughness": 1,                     // 手绘粗糙度：0-2
      "opacity": 100,                     // 透明度：0-100
      "angle": 0,                         // 旋转角度（弧度）
      "x": 420,                           // X坐标
      "y": 40,                            // Y坐标
      "strokeColor": "#1e1e1e",         // 边框颜色
      "backgroundColor": "transparent",   // 背景颜色
      "width": 280,                       // 宽度
      "height": 40,                       // 高度
      "groupIds": [],                     // 所属组ID数组
      "roundness": null,                  // 圆角设置，null或{type: 1-3}
      "boundElements": [],                // 绑定的元素数组
      "fontSize": 28,                     // 字体大小
      "fontFamily": 1,                    // 字体族：1-4
      "text": "AMD Zen CPU 架构总览",      // 文本内容
      "baseline": 30,                     // 基线位置
      "textAlign": "center",              // 水平对齐：left/center/right
      "verticalAlign": "top",             // 垂直对齐：top/middle/bottom
      "containerId": null,                // 容器ID
      "originalText": "AMD Zen CPU 架构总览" // 原始文本
    },
    // ... 其他元素 
  ]
}
\`\`\`
</examples>
 
## Rules (具体规则)
请严格遵守以下规则：
<rules>
- 只需要输出JSON，不需要注释等其他内容
- 按照 ”Task (任务)“ 拆解各个模块，输出的模块，子模块等的内容要详细
- X坐标和Y坐标要根据实际情况调整，不能超出绘图区域，同时考虑模块和模块的关系
- width和height要根据内容调整，不能超出绘图区域，同时考虑模块和模块的关系
- containerId需要考虑模块和子模块的关系，确保子模块在正确的容器内
- 输出语言：${language}
</rules>

## Task (任务)
<context>
${prompt}
</context>
`;
}
