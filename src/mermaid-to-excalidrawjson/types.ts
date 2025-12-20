export type ArrayElement<A> = A extends readonly (infer T)[] ? T : never;

export type ExcalidrawElement = any;

export type ExcalidrawVertexElement = any;
