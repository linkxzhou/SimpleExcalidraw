import { nanoid } from "nanoid";
import { GraphConverter } from "../GraphConverter";
import {
  getText,
  computeExcalidrawVertexStyle,
  computeExcalidrawArrowType,
} from "../helpers";
import { VERTEX_TYPE } from "../../interfaces";
import { Flowchart } from "../../parser/flowchart";

// 生成随机种子
const generateSeed = () => Math.floor(Math.random() * 2147483647);

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

const computeGroupIds = (
  graph: Flowchart,
): {
  getGroupIds: (elementId: string) => string[];
  getParentId: (elementId: string) => string | null;
} => {
  const verticesAny = (graph as any).vertices;
  const getVertex = (id: string) =>
    verticesAny instanceof Map ? verticesAny.get(id) : verticesAny?.[id];
  const getVertexIds = (): string[] =>
    verticesAny instanceof Map
      ? Array.from(verticesAny.keys())
      : Object.keys(verticesAny || {});

  const tree: {
    [key: string]: {
      id: string;
      parent: string | null;
      isLeaf: boolean;
    };
  } = {};
  graph.subGraphs.forEach((subGraph) => {
    subGraph.nodeIds.forEach((nodeId) => {
      tree[subGraph.id] = {
        id: subGraph.id,
        parent: null,
        isLeaf: false,
      };
      tree[nodeId] = {
        id: nodeId,
        parent: subGraph.id,
        isLeaf: getVertex(nodeId) !== undefined,
      };
    });
  });
  const mapper: {
    [key: string]: string[];
  } = {};
  [...getVertexIds(), ...graph.subGraphs.map((c) => c.id)].forEach((id) => {
    if (!tree[id]) {
      return;
    }
    let curr = tree[id];
    const groupIds: string[] = [];
    if (!curr.isLeaf) {
      groupIds.push(`subgraph_group_${curr.id}`);
    }

    while (true) {
      if (curr.parent) {
        groupIds.push(`subgraph_group_${curr.parent}`);
        curr = tree[curr.parent];
      } else {
        break;
      }
    }

    mapper[id] = groupIds;
  });

  return {
    getGroupIds: (elementId) => {
      return mapper[elementId] || [];
    },
    getParentId: (elementId) => {
      return tree[elementId] ? tree[elementId].parent : null;
    },
  };
};

export const FlowchartToExcalidrawSkeletonConverter = new GraphConverter({
  converter: (graph: Flowchart, options) => {
    const elements: any[] = [];
    const fontSize = options.fontSize;
    const { getGroupIds, getParentId } = computeGroupIds(graph);
    let textIdCounts = 0;

    // SubGraphs - 子图
    graph.subGraphs.reverse().forEach((subGraph) => {
      const groupIds = getGroupIds(subGraph.id);
      const id = subGraph.id;

      const container = addBaseProps({
        id,
        type: "rectangle",
        x: subGraph.x,
        y: subGraph.y,
        width: subGraph.width,
        height: subGraph.height,
        strokeColor: "#1e1e1e",
        backgroundColor: "transparent",
        fillStyle: "solid",
        strokeWidth: 2,
        strokeStyle: "solid",
        roughness: 1,
        roundness: null,
        groupIds,
        boundElements: [],
      });

      const labelText = getText(subGraph);
      if (labelText && labelText.trim()) {
        textIdCounts++;
        const textId = `textlable__${textIdCounts}`;

        container.boundElements.push({
          type: "text",
          id: textId,
        });
        elements.push(container);

        addTextData(
          {
            id: textId,
            text: labelText,
            fontSize,
            x: subGraph.x,
            y: subGraph.y,
            width: subGraph.width,
            height: subGraph.height,
            verticalAlign: "top",
            containerId: id,
          },
          elements,
        );
      } else {
        elements.push(container);
      }
    });

    // Vertices - 顶点/节点
    const verticesAny = (graph as any).vertices;
    const vertexValues: any[] =
      verticesAny instanceof Map
        ? Array.from(verticesAny.values())
        : Object.values(verticesAny || {});

    vertexValues.forEach((vertex) => {
      if (!vertex) {
        return;
      }

      const id = vertex.id;
      const groupIds = getGroupIds(id);
      const containerStyle = computeExcalidrawVertexStyle(
        vertex.containerStyle,
      );

      let containerElement: any = {
        id,
        type: "rectangle",
        groupIds,
        x: vertex.x,
        y: vertex.y,
        width: vertex.width,
        height: vertex.height,
        strokeWidth: 2,
        roundness: {
          type: 3,
        },
        link: vertex.link || null,
        ...containerStyle,
        boundElements: [],
      };

      switch (vertex.type) {
        case VERTEX_TYPE.STADIUM: {
          containerElement = { ...containerElement, roundness: { type: 3 } };
          break;
        }
        case VERTEX_TYPE.ROUND: {
          containerElement = { ...containerElement, roundness: { type: 3 } };
          break;
        }
        case VERTEX_TYPE.DOUBLECIRCLE: {
          const CIRCLE_MARGIN = 5;
          // Create new groupId for double circle
          groupIds.push(`doublecircle_${vertex.id}}`);
          // Create inner circle element
          const innerCircle: any = {
            type: "ellipse",
            groupIds,
            x: vertex.x + CIRCLE_MARGIN,
            y: vertex.y + CIRCLE_MARGIN,
            width: vertex.width - CIRCLE_MARGIN * 2,
            height: vertex.height - CIRCLE_MARGIN * 2,
            strokeWidth: 2,
            roundness: { type: 3 },
          };
          containerElement = { ...containerElement, groupIds, type: "ellipse" };
          elements.push(innerCircle);
          break;
        }
        case VERTEX_TYPE.CIRCLE: {
          containerElement.type = "ellipse";
          break;
        }
        case VERTEX_TYPE.DIAMOND: {
          containerElement.type = "diamond";
          break;
        }
      }

      const labelText = getText(vertex);
      if (labelText && labelText.trim()) {
        textIdCounts++;
        const textId = `textlable__${textIdCounts}`;

        containerElement.boundElements.push({
          type: "text",
          id: textId,
        });
        elements.push(containerElement);

        addTextData(
          {
            id: textId,
            text: labelText,
            fontSize,
            x: vertex.x,
            y: vertex.y,
            width: vertex.width,
            height: vertex.height,
            verticalAlign: "middle",
            containerId: id,
          },
          elements,
        );
      } else {
        elements.push(containerElement);
      }
    });

    // Edges - 边/连线
    graph.edges.forEach((edge) => {
      let groupIds: string[] = [];
      const startParentId = getParentId(edge.start);
      const endParentId = getParentId(edge.end);
      if (startParentId && startParentId === endParentId) {
        groupIds = getGroupIds(startParentId);
      }

      const { startX, startY, reflectionPoints } = edge;

      // 计算 points
      const points = reflectionPoints.map((point) => [
        point.x - reflectionPoints[0].x,
        point.y - reflectionPoints[0].y,
      ]);

      const arrowType = computeExcalidrawArrowType(edge.type);
      const arrowId = `${edge.start}_${edge.end}_${nanoid(6)}`;

      const lastPoint = points[points.length - 1] || [0, 0];
      const arrowWidth = Math.abs(lastPoint[0]) || 1;
      const arrowHeight = Math.abs(lastPoint[1]) || 1;

      const arrow = addBaseProps({
        id: arrowId,
        type: "arrow",
        x: startX,
        y: startY,
        width: arrowWidth,
        height: arrowHeight,
        strokeColor: "#1e1e1e",
        backgroundColor: "transparent",
        fillStyle: "solid",
        strokeWidth: edge.stroke === "thick" ? 4 : 2,
        strokeStyle: edge.stroke === "dotted" ? "dashed" : "solid",
        roughness: 1,
        roundness: { type: 2 },
        points,
        groupIds,
        startBinding: { elementId: edge.start, focus: 0, gap: 2 },
        endBinding: { elementId: edge.end, focus: 0, gap: 2 },
        boundElements: [],
        ...arrowType,
      });

      const labelText = getText(edge);
      if (labelText && labelText.trim()) {
        textIdCounts++;
        const textId = `textlable__${textIdCounts}`;

        arrow.boundElements.push({
          type: "text",
          id: textId,
        });
        elements.push(arrow);

        addTextData(
          {
            id: textId,
            text: labelText,
            fontSize,
            x: arrow.x,
            y: arrow.y,
            width: arrow.width,
            height: arrow.height,
            verticalAlign: "middle",
            containerId: arrowId,
          },
          elements,
        );
      }

      // Bind start and end vertex to arrow
      const startVertex = elements.find((e) => e.id === edge.start);
      const endVertex = elements.find((e) => e.id === edge.end);
      if (!startVertex || !endVertex) {
        return;
      }

      arrow.start = {
        id: startVertex.id || "",
      };
      arrow.end = {
        id: endVertex.id || "",
      };

      elements.push(arrow);
    });

    return {
      elements,
    };
  },
});

const addTextData = (elementText: any, elementList: any) => {
  elementList.push({
    id: elementText.id || nanoid(12),
    type: "text",
    x: elementText.x || 0,
    y: elementText.y || 0,
    width: elementText.width || 0,
    height: elementText.height || 0,
    angle: 0,
    strokeColor: "#000000",
    backgroundColor: "transparent",
    fillStyle: "hachure",
    strokeWidth: 1,
    strokeStyle: "solid",
    roughness: 1,
    opacity: 100,
    groupIds: [],
    roundness: null,
    isDeleted: false,
    boundElements: null,
    locked: false,
    text: elementText.text,
    fontSize: 20,
    fontFamily: 1,
    textAlign: "center",
    verticalAlign: "middle",
    autoResize: true,
    baseline: 18,
    originalText: elementText.text,
    containerId: elementText.containerId || "",
    ...elementText,
  });
};
