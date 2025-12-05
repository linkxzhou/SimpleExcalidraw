import React, { useEffect, useRef } from "react";
import { NonDeletedExcalidrawElement } from "../element/types";
import { AppState } from "../types";
import { exportToSvg } from "../scene/export";
import { animateSvg } from "./animate";

interface ViewerProps {
  elements: readonly NonDeletedExcalidrawElement[];
  appState: AppState;
  duration: number;
  loop: boolean;
  version: number;
  paused: boolean;
}

export const Viewer: React.FC<ViewerProps> = ({
  elements,
  appState,
  duration,
  loop,
  version,
  paused,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const controllerRef = useRef<{
    cancel: () => void;
    pause: () => void;
    play: () => void;
    seek: (t: number) => void;
  } | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const pausedRef = useRef(paused);

  useEffect(() => {
    pausedRef.current = paused;
    if (controllerRef.current) {
      if (paused) {
        controllerRef.current.pause();
      } else {
        controllerRef.current.play();
      }
    }
  }, [paused]);

  useEffect(() => {
    const render = async () => {
      if (!containerRef.current) {
        return;
      }

      // Cleanup previous animation
      if (controllerRef.current) {
        controllerRef.current.cancel();
      }

      try {
        const svg = await exportToSvg(
          elements,
          {
            exportBackground: true,
            viewBackgroundColor: appState.viewBackgroundColor,
          },
          null,
        );

        svgRef.current = svg;
        containerRef.current.innerHTML = "";
        containerRef.current.appendChild(svg);

        svg.style.maxWidth = "100%";
        svg.style.height = "100%";
        svg.style.objectFit = "contain";

        const controller = animateSvg(svg, { duration, loop });
        controllerRef.current = controller;

        if (pausedRef.current) {
          controller.pause();
        }
      } catch (error) {
        console.error("Failed to render animation", error);
      }
    };

    render();
  }, [elements, appState, duration, loop, version]);

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        height: "100%",
        overflow: "hidden",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    />
  );
};
