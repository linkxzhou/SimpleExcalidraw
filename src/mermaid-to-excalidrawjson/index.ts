import { DEFAULT_FONT_SIZE } from "./constants";
import { FlowchartToExcalidrawSkeletonConverter } from "./converter/types/flowchart";
import { GraphImageConverter } from "./converter/types/graphImage";
import { SequenceToExcalidrawSkeletonConvertor } from "./converter/types/sequence";
import { classToExcalidrawSkeletonConvertor } from "./converter/types/class";
import { parseMermaid } from "./parseMermaid";
import { validateMermaid } from "./validateMermaid";

export interface MermaidConfig {
  startOnLoad?: boolean;
  flowchart?: {
    curve?: "linear" | "basis";
  };
  themeVariables?: {
    fontSize?: string;
  };
  maxEdges?: number;
  maxTextSize?: number;
}

export interface ExcalidrawConfig {
  fontSize?: number;
}

/**
 * 将 Mermaid 定义直接转换为 Excalidraw JSON 数据
 */
const parseMermaidToExcalidraw = async (
  definition: string,
  config?: MermaidConfig,
) => {
  const mermaidConfig = config || {};
  const fontSize =
    parseInt(mermaidConfig.themeVariables?.fontSize ?? "") || DEFAULT_FONT_SIZE;

  const parsedMermaidData = await parseMermaid(definition, {
    ...mermaidConfig,
    themeVariables: {
      ...mermaidConfig.themeVariables,
      fontSize: `${fontSize * 1.25}px`,
    },
  });

  console.log("parsedMermaidData: ", parsedMermaidData);

  const { elements, files } = (() => {
    switch (parsedMermaidData.type) {
      case "graphImage":
        return GraphImageConverter.convert(parsedMermaidData, { fontSize });
      case "flowchart":
        return FlowchartToExcalidrawSkeletonConverter.convert(
          parsedMermaidData,
          { fontSize },
        );
      case "sequence":
        return SequenceToExcalidrawSkeletonConvertor.convert(
          parsedMermaidData,
          { fontSize },
        );
      case "class":
        return classToExcalidrawSkeletonConvertor.convert(parsedMermaidData, {
          fontSize,
        });
      default:
        throw new Error(
          `Unsupported diagram type: "${(parsedMermaidData as any).type}"`,
        );
    }
  })();

  return {
    type: "excalidraw",
    version: 2,
    source: "mermaid-to-excalidraw",
    elements,
    appState: {
      gridSize: null,
      viewBackgroundColor: "#ffffff",
    },
    files: files || {},
  };
};

export { parseMermaidToExcalidraw, validateMermaid };
