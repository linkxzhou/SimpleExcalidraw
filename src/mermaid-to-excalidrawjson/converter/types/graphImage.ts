import { GraphConverter } from "../GraphConverter";
import { FileId } from "../../../element/types";
import { BinaryFiles } from "../../../types";
import { nanoid } from "nanoid";
import { GraphImage } from "../../interfaces";

// 生成随机种子
const generateSeed = () => Math.floor(Math.random() * 2147483647);

export const GraphImageConverter = new GraphConverter<GraphImage>({
  converter: (graph) => {
    const imageId = nanoid() as FileId;
    const { width, height } = graph;

    const imageElement: any = {
      id: nanoid(),
      type: "image",
      x: 0,
      y: 0,
      width,
      height,
      angle: 0,
      opacity: 100,
      strokeColor: "transparent",
      backgroundColor: "transparent",
      fillStyle: "hachure",
      strokeWidth: 1,
      strokeStyle: "solid",
      roughness: 1,
      roundness: null,
      status: "saved",
      fileId: imageId,
      scale: [1, 1],
      seed: generateSeed(),
      version: 1,
      versionNonce: 0,
      isDeleted: false,
      groupIds: [],
      boundElements: [],
    };

    const files = {
      [imageId]: {
        id: imageId,
        mimeType: graph.mimeType,
        dataURL: graph.dataURL,
      },
    } as BinaryFiles;

    return { files, elements: [imageElement] };
  },
});
