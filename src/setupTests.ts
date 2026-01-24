import "@testing-library/jest-dom";
import "jest-canvas-mock";
import dotenv from "dotenv";
import polyfill from "./polyfill";

require("fake-indexeddb/auto");

polyfill();
// jest doesn't know of .env.development so we need to init it ourselves
dotenv.config({
  path: require("path").resolve(__dirname, "../.env.development"),
});

jest.mock("nanoid", () => {
  return {
    nanoid: jest.fn(() => "test-id"),
  };
});

jest.mock("react-pdftotext", () => {
  return {
    __esModule: true,
    default: jest.fn(async () => ""),
  };
});

jest.mock("mermaid", () => {
  return {
    __esModule: true,
    default: {
      initialize: jest.fn(),
      mermaidAPI: {
        getDiagramFromText: jest.fn(async () => ({
          type: "flowchart-v2",
          db: {
            getVertices: jest.fn(() => ({})),
            getClasses: jest.fn(() => ({})),
            getEdges: jest.fn(() => []),
            getSubGraphs: jest.fn(() => []),
          },
        })),
      },
      render: jest.fn(async () => ({ svg: "" })),
    },
  };
});
// ReactDOM is located inside index.tsx file
// as a result, we need a place for it to render into
const element = document.createElement("div");
element.id = "root";
document.body.appendChild(element);
