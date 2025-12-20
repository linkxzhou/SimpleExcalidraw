import { nanoid } from "nanoid";
import {
  transformToExcalidrawArrowSkeleton,
  transformToExcalidrawContainerSkeleton,
  transformToExcalidrawLineSkeleton,
  transformToExcalidrawTextSkeleton,
} from "../transformToExcalidrawSkeleton";
import { GraphConverter } from "../GraphConverter";

import type { Class } from "../../parser/class";

// 辅助函数：将转换结果展平为数组
const flattenResult = (result: any | any[]) => {
  return Array.isArray(result) ? result : [result];
};

export const classToExcalidrawSkeletonConvertor = new GraphConverter({
  converter: (chart: Class) => {
    const elements: any[] = [];

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
        elements.push(...flattenResult(result));
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
    });

    Object.values(chart.text).forEach((ele) => {
      elements.push(transformToExcalidrawTextSkeleton(ele));
    });

    Object.values(chart.namespaces).forEach((namespace) => {
      const classIds = Object.keys(namespace.classes);
      const children = [...classIds];
      const chartElements = [...chart.lines, ...chart.arrows, ...chart.text];

      classIds.forEach((classId) => {
        const childIds = chartElements
          .filter((ele) => ele.metadata && ele.metadata.classId === classId)
          .map((ele) => ele.id);
        if (childIds.length) {
          children.push(...(childIds as string[]));
        }
      });

      elements.push({
        type: "frame",
        id: nanoid(),
        name: namespace.id,
        children,
      });
    });

    return { elements };
  },
});
