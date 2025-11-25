import React, { useState } from "react";
import clsx from "clsx";
import { ToolButton, ToolButtonSize } from "./ToolButton";
import { AIIcon } from "./icons";
import { Button, Modal, Input, Upload, message } from "antd";
import {
  requestCompletions,
  loadAISettings,
  saveAISettings,
} from "./AiButtonAction";
import { useExcalidrawAppState, useExcalidrawSetAppState } from "./App";
import { loadFromJSONString } from "../data/json";
import { t } from "../i18n";
import type { ModalProps, ConfigProviderProps } from "antd";
import { pdfjs } from "react-pdf";

type AIButtonProps = {
  title?: string;
  onClick?(): void;
  isMobile?: boolean;
  size?: ToolButtonSize;
  className?: string;
  icon?: React.ReactNode;
  checked?: boolean;
};

const DEFAULT_SIZE: ToolButtonSize = "medium";
type SizeType = ConfigProviderProps["componentSize"];

export const AIButton: React.FC<AIButtonProps> = (props) => {
  const [open, setOpen] = useState(false);
  const defaults = loadAISettings();
  const [textAreaValue, setTextAreaValue] = useState("");
  const [api, setApi] = useState(defaults.api || "");
  const [secret, setSecret] = useState(defaults.secret || "");
  const [model, setModel] = useState(defaults.model || "");
  const [loading, setLoading] = useState(false);
  const onChange = (e: React.ChangeEvent<HTMLTextAreaElement>) =>
    setTextAreaValue(e.target.value);
  const [size] = useState<SizeType>("middle");
  const appState = useExcalidrawAppState();
  const setAppState = useExcalidrawSetAppState();

  const { TextArea } = Input;
  const sharedContent = (
    <>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 8,
          marginBottom: 8,
        }}
      >
        <label
          style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span style={{ whiteSpace: "nowrap" }}>{t("toolBar.aiAPI")} : </span>
          <Input
            name="api"
            value={api}
            onChange={(e) => setApi(e.target.value)}
            placeholder="https://api.openai.com/v1/chat/completions"
            allowClear
            style={{ flex: 1, minWidth: 0, borderColor: "#e3e2fe" }}
          />
        </label>
        <label
          style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span style={{ whiteSpace: "nowrap" }}>
            {t("toolBar.aiAPIKey")} :{" "}
          </span>
          <Input.Password
            name="secret"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            placeholder="sk-xxxxx..."
            style={{ flex: 1, minWidth: 0, borderColor: "#e3e2fe" }}
          />
        </label>
        <label
          style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span style={{ whiteSpace: "nowrap" }}>
            {t("toolBar.aiModel")} :{" "}
          </span>
          <Input
            name="model"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            placeholder="gpt-5"
            style={{ flex: 1, minWidth: 0, borderColor: "#e3e2fe" }}
          />
        </label>
      </div>
      <label>
        <span>{t("toolBar.aiPrompt")} : </span>
        <TextArea
          value={textAreaValue}
          showCount
          maxLength={9000}
          onChange={onChange}
          placeholder={t("toolBar.aiPromptPlaceholder")}
          style={{ height: 180, borderColor: "#e3e2fe", paddingTop: 8 }}
        />
      </label>
    </>
  );

  const styles: ModalProps["styles"] = {
    mask: {
      backgroundImage:
        "linear-gradient(to top, #e3e2fe 0, rgba(21, 21, 22, 0.2) 100%)",
    },
    container: { border: "1px solid #ccc", overflow: "hidden" },
    header: { padding: 4 },
    body: { padding: 4 },
    footer: {
      padding: "4px",
      backgroundColor: "#fafafa",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
    },
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      saveAISettings({ api, secret, model });
      const { ideas } = await requestCompletions({
        api,
        secret,
        model,
        temperature: 0.6,
        prompt: textAreaValue,
      });
      const jsonStr = typeof ideas === "string" ? ideas : JSON.stringify(ideas);
      const { elements, appState: loadedAppState } = await loadFromJSONString(
        jsonStr,
        appState,
        null,
      );
      try {
        console.log("AI更新场景", elements, loadedAppState);
        (window as any)?.h?.app?.updateScene({
          elements,
          appState: loadedAppState,
          commitToHistory: true,
        });
      } catch (e) {
        console.error("AI更新场景失败", e);
        message.error("AI更新场景失败，请检查配置");
      }
      setAppState(loadedAppState);
      setOpen(false);
    } catch (err) {
      console.error("AI请求失败", err);
      message.error("AI请求失败，请检查配置");
    } finally {
      setLoading(false);
    }
  };

  const handleParsePromptUpload = async (file: File) => {
    const ext = (file.name.split(".").pop() || "").toLowerCase();
    try {
      if (ext === "md" || ext === "txt" || ext === "csv") {
        const text = await file.text();
        setTextAreaValue(text);
        message.success("解析成功，已填充到提示词");
      } else if (ext === "pdf") {
        const buf = new Uint8Array(await file.arrayBuffer());
        const text = await extractPdfText(buf);
        if (text.trim()) {
          setTextAreaValue(text);
          message.success("PDF解析完成，已填充到提示词");
        } else {
          message.error("PDF解析失败，请尝试上传.md/.txt/.csv");
        }
      } else {
        message.error("仅支持 .md/.txt/.csv/.pdf");
      }
    } catch (e) {
      message.error("文件解析失败");
      console.error(e);
    }
    return false;
  };

  const extractPdfText = async (data: Uint8Array) => {
    pdfjs.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist/build/pdf.worker.min.js`;
    const loadingTask = pdfjs.getDocument({ data });
    const pdf = await loadingTask.promise;
    const out: string[] = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items.map((it: any) => it.str || "").join(" ");
      out.push(pageText);
    }
    return out.join("\n");
  };

  const footer = (
    <>
      <Upload
        showUploadList={false}
        beforeUpload={handleParsePromptUpload}
        accept=".md,.txt,.csv,.pdf"
        maxCount={1}
      >
        <Button size="small" style={{ marginRight: 8 }}>
          上传文件，支持解析.md,.txt,.csv,.pdf
        </Button>
      </Upload>
      <Button
        type="primary"
        size={size}
        style={{ backgroundColor: "#6965db" }}
        loading={loading}
        onClick={handleSubmit}
      >
        {t("toolBar.aiSubmit")}
      </Button>
    </>
  );

  const handleClick = () => {
    setOpen(true);
    props.onClick?.();
  };

  return (
    <>
      <ToolButton
        type="icon"
        size={props.size || DEFAULT_SIZE}
        title={props.title || t("toolBar.aiAssistant")}
        aria-label={props.title || t("toolBar.aiAssistant")}
        label={undefined}
        icon={props.icon ?? AIIcon}
        onClick={handleClick}
        selected={!!props.checked}
        className={clsx(props.className, { "is-mobile": !!props.isMobile })}
        data-testid="toolbar-ai"
        showAriaLabel={false}
      />
      <Modal
        centered
        title={t("toolBar.aiAssistant")}
        styles={styles}
        footer={footer}
        open={open}
        onOk={() => setOpen(false)}
        onCancel={() => setOpen(false)}
      >
        {sharedContent}
      </Modal>
    </>
  );
};

export default AIButton;
