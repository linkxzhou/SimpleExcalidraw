import React from "react";
import { Button, Switch, Select } from "antd";
import { t } from "../i18n";

interface AnimateConfigProps {
  duration: number;
  setDuration: (val: number) => void;
  loop: boolean;
  setLoop: (val: boolean) => void;
  onReplay: () => void;
  paused: boolean;
  setPaused: (val: boolean) => void;
}

export const AnimateConfig: React.FC<AnimateConfigProps> = ({
  duration,
  setDuration,
  loop,
  setLoop,
  onReplay,
  paused,
  setPaused,
}) => {
  const durationOptions = [
    { label: "5s", value: 5000 },
    { label: "10s", value: 10000 },
    { label: "15s", value: 15000 },
    { label: "30s", value: 30000 },
    { label: "60s", value: 60000 },
    { label: "90s", value: 90000 },
  ];

  return (
    <div
      style={{
        padding: 4,
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span>{t("other.animateDuration")}:</span>
        <Select
          value={duration}
          onChange={setDuration}
          options={durationOptions}
          style={{ width: 80 }}
        />
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span>{t("other.animateLoop")}:</span>
        <Switch
          checked={loop}
          onChange={setLoop}
          style={{ backgroundColor: loop ? "#6965db" : undefined }}
        />
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginLeft: "auto",
        }}
      >
        <Button
          onClick={onReplay}
          type="primary"
          style={{ backgroundColor: "#6965db", borderColor: "#6965db" }}
        >
          {t("other.animateReplay")}
        </Button>
      </div>
    </div>
  );
};
