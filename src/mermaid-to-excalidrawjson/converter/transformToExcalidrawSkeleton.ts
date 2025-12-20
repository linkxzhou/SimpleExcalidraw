import { nanoid } from "nanoid";
import { Arrow, Line, Node, Text } from "../elementSkeleton";

// 生成随机种子
const generateSeed = () => Math.floor(Math.random() * 2147483647);

// 计算文本高度（基于字体大小和行数）
const calculateTextHeight = (text: string, fontSize: number): number => {
  const lineHeight = fontSize * 1.25;
  const lines = text.split("\n").length;
  return Math.max(lines * lineHeight, fontSize);
};

// 计算文本宽度（估算）
const calculateTextWidth = (text: string, fontSize: number): number => {
  // 中文字符按完整宽度计算，英文按0.6计算
  let width = 0;
  for (const char of text) {
    if (/[\u4e00-\u9fa5]/.test(char)) {
      width += fontSize;
    } else {
      width += fontSize * 0.6;
    }
  }
  return Math.max(width, fontSize);
};

// 为元素添加基础属性
const addBaseProps = (element: any) => ({
  ...element,
  angle: element.angle ?? 0,
  opacity: element.opacity ?? 100,
  seed: element.seed ?? generateSeed(),
  version: element.version ?? 1,
  versionNonce: element.versionNonce ?? 0,
  isDeleted: element.isDeleted ?? false,
  frameId: element.frameId ?? null,
  updated: element.updated ?? Date.now(),
  link: element.link ?? null,
  locked: element.locked ?? false,
});

export const normalizeText = (text: string) => {
  return text.replace(/\\n/g, "\n");
};

export const transformToExcalidrawLineSkeleton = (line: Line) => {
  return addBaseProps({
    id: line.id || nanoid(),
    type: "line",
    x: line.startX,
    y: line.startY,
    width: Math.abs(line.endX - line.startX),
    height: Math.abs(line.endY - line.startY),
    points: [
      [0, 0],
      [line.endX - line.startX, line.endY - line.startY],
    ],
    strokeColor: line.strokeColor || "#1e1e1e",
    backgroundColor: "transparent",
    fillStyle: "solid",
    strokeWidth: line.strokeWidth || 2,
    strokeStyle: line.strokeStyle || "solid",
    roughness: 1,
    roundness: null,
    groupIds: line.groupId ? [line.groupId] : [],
    boundElements: [],
  });
};

export const transformToExcalidrawTextSkeleton = (element: Text) => {
  const normalizedText = normalizeText(element.text) || "";
  const fontSize = element.fontSize || 20;
  const textWidth =
    element.width || calculateTextWidth(normalizedText, fontSize);
  const textHeight =
    element.height || calculateTextHeight(normalizedText, fontSize);

  return addBaseProps({
    id: element.id || nanoid(),
    type: "text",
    x: element.x,
    y: element.y,
    width: textWidth,
    height: textHeight,
    text: normalizedText,
    fontSize: 20,
    fontFamily: 1,
    textAlign: "center",
    verticalAlign: "middle",
    originalText: normalizedText,
    autoResize: true,
    strokeColor: "#1e1e1e",
    backgroundColor: "transparent",
    fillStyle: "hachure",
    strokeWidth: 1,
    strokeStyle: "solid",
    roughness: 1,
    baseline: 18,
    opacity: 100,
    groupIds: element.groupId ? [element.groupId] : [],
    containerId: element.groupId || "",
  });
};

export const transformToExcalidrawContainerSkeleton = (
  element: Exclude<Node, Line | Arrow | Text>,
) => {
  const id = element.id || nanoid();
  const groupIds = element.groupId ? [element.groupId] : [];

  const container: any = addBaseProps({
    id,
    type: element.type,
    x: element.x,
    y: element.y,
    width: element.width,
    height: element.height,
    strokeColor: element?.strokeColor || "#1e1e1e",
    backgroundColor: element?.bgColor || "transparent",
    fillStyle: "solid",
    strokeWidth: element?.strokeWidth || 2,
    strokeStyle: element?.strokeStyle || "solid",
    roughness: 1,
    roundness: null,
    groupIds,
    boundElements: [],
  });

  // 为 activation 类型设置背景色
  if (element.type === "rectangle" && element.subtype === "activation") {
    container.backgroundColor = "#e9ecef";
  }

  // 如果有标签文本，创建绑定的文本元素
  const labelText = element?.label?.text;
  if (labelText && labelText.trim()) {
    const textId = `${id}__label`;
    container.boundElements = [{ type: "text", id: textId }];

    const normalizedText = normalizeText(labelText);
    const fontSize = element.label?.fontSize || 20;
    const textWidth = calculateTextWidth(normalizedText, fontSize);
    const textHeight = calculateTextHeight(normalizedText, fontSize);

    const elementWidth = element.width || 0;
    const elementHeight = element.height || 0;

    const textElement = addBaseProps({
      id: textId,
      type: "text",
      x: element.x + (elementWidth - textWidth) / 2,
      y: element.y + (elementHeight - textHeight) / 2,
      width: textWidth,
      height: textHeight,
      text: normalizedText,
      fontSize,
      fontFamily: 1,
      textAlign: "center",
      verticalAlign: element.label?.verticalAlign || "middle",
      containerId: id,
      originalText: normalizedText,
      autoResize: true,
      lineHeight: 1.25,
      strokeColor: element.label?.color || "#1e1e1e",
      backgroundColor: "transparent",
      fillStyle: "solid",
      strokeWidth: 2,
      strokeStyle: "solid",
      roughness: 1,
      groupIds: (element.label as any)?.groupIds || groupIds,
    });

    return [container, textElement];
  }

  return container;
};

export const transformToExcalidrawArrowSkeleton = (arrow: Arrow) => {
  const id = arrow.id || nanoid();
  const groupIds = arrow.groupId ? [arrow.groupId] : [];

  const arrowElement = addBaseProps({
    id,
    type: "arrow",
    x: arrow.startX,
    y: arrow.startY,
    width: Math.abs(arrow.endX - arrow.startX),
    height: Math.abs(arrow.endY - arrow.startY),
    points: arrow.points || [
      [0, 0],
      [arrow.endX - arrow.startX, arrow.endY - arrow.startY],
    ],
    strokeColor: "#1e1e1e",
    backgroundColor: "transparent",
    fillStyle: "solid",
    strokeWidth: 2,
    strokeStyle: arrow?.strokeStyle || "solid",
    roughness: 1,
    roundness: { type: 2 },
    startArrowhead: arrow?.startArrowhead || null,
    endArrowhead: arrow?.endArrowhead || null,
    startBinding: arrow.start?.id
      ? { elementId: arrow.start.id, focus: 0, gap: 2 }
      : null,
    endBinding: arrow.end?.id
      ? { elementId: arrow.end.id, focus: 0, gap: 2 }
      : null,
    groupIds,
    boundElements: [],
  });

  // 如果有标签，添加标签文本
  const labelText = arrow?.label?.text;
  if (labelText && labelText.trim()) {
    const textId = `${id}__label`;
    const normalizedText = normalizeText(labelText);
    const fontSize = arrow.label?.fontSize || 16;
    const textWidth = calculateTextWidth(normalizedText, fontSize);
    const textHeight = calculateTextHeight(normalizedText, fontSize);

    const textElement = addBaseProps({
      id: textId,
      type: "text",
      x: arrow.startX + (arrow.endX - arrow.startX) / 2 - textWidth / 2,
      y: arrow.startY + (arrow.endY - arrow.startY) / 2 - textHeight / 2,
      width: textWidth,
      height: textHeight,
      text: normalizedText,
      fontSize,
      fontFamily: 1,
      textAlign: "center",
      verticalAlign: "middle",
      originalText: normalizedText,
      autoResize: true,
      lineHeight: 1.25,
      strokeColor: "#1e1e1e",
      backgroundColor: "transparent",
      fillStyle: "solid",
      strokeWidth: 2,
      strokeStyle: "solid",
      roughness: 1,
      groupIds,
    });

    return [arrowElement, textElement];
  }

  return arrowElement;
};
