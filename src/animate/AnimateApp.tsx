import React, { useState } from "react";
import { Modal } from "antd";
import {
  useExcalidrawAppState,
  useExcalidrawElements,
} from "../components/App";
import { Viewer } from "./Viewer";
import { AnimateConfig } from "./AnimateConfig";

interface AnimateAppProps {
  open: boolean;
  onCancel: () => void;
}

export const AnimateApp: React.FC<AnimateAppProps> = ({ open, onCancel }) => {
  const elements = useExcalidrawElements();
  const appState = useExcalidrawAppState();
  const [duration, setDuration] = useState(5000);
  const [loop, setLoop] = useState(false);
  const [version, setVersion] = useState(0);
  const [paused, setPaused] = useState(false);

  const handleReplay = () => {
    setVersion((v) => v + 1);
    setPaused(false);
  };

  return (
    <Modal
      open={open}
      onCancel={onCancel}
      footer={null}
      width={"90%"}
      title="Excalidraw 动画"
      centered
      style={{ top: 20 }}
      bodyStyle={{ height: "80vh", padding: 0 }}
    >
      <div
        style={{
          height: "100%",
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        <div
          style={{
            flex: 1,
            minHeight: 0,
            border: "1px solid #f0f0f0",
            borderRadius: 4,
            overflow: "hidden",
            background: "#fafafa",
          }}
        >
          <Viewer
            elements={elements}
            appState={appState}
            duration={duration}
            loop={loop}
            version={version}
            paused={paused}
          />
        </div>
        <div style={{ flexShrink: 0 }}>
          <AnimateConfig
            duration={duration}
            setDuration={setDuration}
            loop={loop}
            setLoop={setLoop}
            onReplay={handleReplay}
            paused={paused}
            setPaused={setPaused}
          />
        </div>
      </div>
    </Modal>
  );
};
