import { nanoid } from "nanoid";

import { GraphConverter } from "../GraphConverter";
import { Sequence } from "../../parser/sequence";
import {
  transformToExcalidrawLineSkeleton,
  transformToExcalidrawTextSkeleton,
  transformToExcalidrawContainerSkeleton,
  transformToExcalidrawArrowSkeleton,
} from "../transformToExcalidrawSkeleton";

// 辅助函数：将转换结果展平为数组
const flattenResult = (result: any | any[]) => {
  return Array.isArray(result) ? result : [result];
};

export const SequenceToExcalidrawSkeletonConvertor = new GraphConverter({
  converter: (chart: Sequence) => {
    const elements: any[] = [];
    const activations: any[] = [];

    Object.values(chart.nodes).forEach((node) => {
      if (!node || !node.length) {
        return;
      }
      node.forEach((element) => {
        let result: any;

        switch (element.type) {
          case "line":
            result = transformToExcalidrawLineSkeleton(element);
            break;
          case "rectangle":
          case "ellipse":
            result = transformToExcalidrawContainerSkeleton(element);
            break;
          case "text":
            result = transformToExcalidrawTextSkeleton(element);
            break;
          default:
            throw new Error(`unknown type ${element.type}`);
        }

        const items = flattenResult(result);
        if (element.type === "rectangle" && element?.subtype === "activation") {
          activations.push(...items);
        } else {
          elements.push(...items);
        }
      });
    });

    Object.values(chart.lines).forEach((line) => {
      if (!line) {
        return;
      }
      elements.push(transformToExcalidrawLineSkeleton(line));
    });

    Object.values(chart.arrows).forEach((arrow) => {
      if (!arrow) {
        return;
      }
      elements.push(
        ...flattenResult(transformToExcalidrawArrowSkeleton(arrow)),
      );
      if (arrow.sequenceNumber) {
        elements.push(
          ...flattenResult(
            transformToExcalidrawContainerSkeleton(arrow.sequenceNumber),
          ),
        );
      }
    });

    elements.push(...activations);

    // 处理 loops
    if (chart.loops) {
      const { lines, texts, nodes } = chart.loops;
      lines.forEach((line) => {
        elements.push(transformToExcalidrawLineSkeleton(line));
      });
      texts.forEach((text) => {
        elements.push(transformToExcalidrawTextSkeleton(text));
      });
      nodes.forEach((node) => {
        elements.push(
          ...flattenResult(transformToExcalidrawContainerSkeleton(node)),
        );
      });
    }

    // 处理 groups
    if (chart.groups) {
      chart.groups.forEach((group) => {
        const { actorKeys, name } = group;
        let minX = Infinity;
        let minY = Infinity;
        let maxX = 0;
        let maxY = 0;

        if (!actorKeys.length) {
          return;
        }

        const actors = elements.filter((ele) => {
          if (ele.id) {
            const hyphenIndex = ele.id.indexOf("-");
            const id = ele.id.substring(0, hyphenIndex);
            return actorKeys.includes(id);
          }
          return false;
        });

        actors.forEach((actor) => {
          if (
            actor.x === undefined ||
            actor.y === undefined ||
            actor.width === undefined ||
            actor.height === undefined
          ) {
            throw new Error(`Actor attributes missing ${actor}`);
          }
          minX = Math.min(minX, actor.x);
          minY = Math.min(minY, actor.y);
          maxX = Math.max(maxX, actor.x + actor.width);
          maxY = Math.max(maxY, actor.y + actor.height);
        });

        const PADDING = 10;
        const groupRectId = nanoid();
        const groupRectResult = transformToExcalidrawContainerSkeleton({
          type: "rectangle",
          x: minX - PADDING,
          y: minY - PADDING,
          width: maxX - minX + PADDING * 2,
          height: maxY - minY + PADDING * 2,
          bgColor: group.fill,
          id: groupRectId,
        });
        elements.unshift(...flattenResult(groupRectResult));

        const frameId = nanoid();
        const frameChildren: string[] = [groupRectId];

        elements.forEach((ele) => {
          if (ele.type === "frame") {
            return;
          }
          if (
            ele.x === undefined ||
            ele.y === undefined ||
            ele.width === undefined ||
            ele.height === undefined
          ) {
            throw new Error(`Element attributes missing ${ele}`);
          }
          if (
            ele.x >= minX &&
            ele.x + ele.width <= maxX &&
            ele.y >= minY &&
            ele.y + ele.height <= maxY
          ) {
            const elementId = ele.id || nanoid();
            if (!ele.id) {
              ele.id = elementId;
            }
            frameChildren.push(elementId);
          }
        });

        elements.push({
          type: "frame",
          id: frameId,
          name,
          children: frameChildren,
        });
      });
    }

    return { elements };
  },
});
