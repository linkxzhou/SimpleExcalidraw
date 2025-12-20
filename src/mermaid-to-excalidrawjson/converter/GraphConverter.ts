import { ExcalidrawConfig } from "../index";
import { DEFAULT_FONT_SIZE } from "../constants";
import { MermaidToExcalidrawResult } from "../interfaces";
import { Flowchart } from "../parser/flowchart";
import { Sequence } from "../parser/sequence";

export class GraphConverter<T = Flowchart | Sequence> {
  private converter;
  constructor({
    converter,
  }: {
    converter: (
      graph: T,
      config: Required<ExcalidrawConfig>,
    ) => MermaidToExcalidrawResult;
  }) {
    this.converter = converter;
  }
  convert = (graph: T, config: ExcalidrawConfig) => {
    return this.converter(graph, {
      ...config,
      fontSize: config.fontSize || DEFAULT_FONT_SIZE,
    });
  };
}
