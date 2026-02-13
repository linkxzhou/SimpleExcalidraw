import React, { useState, useEffect } from "react";
import clsx from "clsx";
import { ToolButton, ToolButtonSize } from "./ToolButton";
import { AIIcon } from "./icons";
import { Button, Modal, Input, Upload, message, AutoComplete } from "antd";
import {
  requestCompletions,
  requestTextCompletions,
  buildExtendPrompt,
  buildMindPrompt,
  buildExcalidrawPrompt,
  loadAISettings,
  saveAISettings,
} from "./AiButtonAction";
import {
  useExcalidrawAppState,
  useExcalidrawSetAppState,
  useExcalidrawActionManager,
} from "./App";
import { actionZoomToFit } from "../actions";
import { loadFromJSONString } from "../data/json";
import { t } from "../i18n";
import type { ModalProps, ConfigProviderProps } from "antd";
import pdfToText from "react-pdftotext";
import { parseMermaidToExcalidraw } from "../mermaid-to-excalidrawjson";
// import { actionSelectAll, actionChangeTextAlign } from "../actions";

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

const MODEL_OPTIONS = [
  { value: "Pro/moonshotai/Kimi-K2.5", label: "Pro/moonshotai/Kimi-K2.5" },
  { value: "Pro/zai-org/GLM-5", label: "Pro/zai-org/GLM-5" },
  { value: "Pro/zai-org/GLM-4.7", label: "Pro/zai-org/GLM-4.7" },
  { value: "deepseek-ai/DeepSeek-V3.2", label: "deepseek-ai/DeepSeek-V3.2" },
];

export const AIButton: React.FC<AIButtonProps> = (props) => {
  const [open, setOpen] = useState(false);
  const defaults = loadAISettings();
  const [textAreaValue, setTextAreaValue] = useState(defaults.prompt || "");
  const [api, setApi] = useState(defaults.api || "");
  const [secret, setSecret] = useState(defaults.secret || "");
  const [model, setModel] = useState(
    defaults.model || "Pro/moonshotai/Kimi-K2.5",
  );
  const [modelSearch, setModelSearch] = useState("");
  const [loadingExcalidraw, setLoadingExcalidraw] = useState(false);
  const [loadingMind, setLoadingMind] = useState(false);
  const [extending, setExtending] = useState(false);
  const isAnyLoading = loadingExcalidraw || loadingMind;
  const onChange = (e: React.ChangeEvent<HTMLTextAreaElement>) =>
    setTextAreaValue(e.target.value);
  const [size] = useState<SizeType>("middle");
  const appState = useExcalidrawAppState();
  const setAppState = useExcalidrawSetAppState();
  const actionManager = useExcalidrawActionManager();

  const [isSmallScreen, setIsSmallScreen] = useState(window.innerWidth < 500);

  useEffect(() => {
    const handleResize = () => setIsSmallScreen(window.innerWidth < 500);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    saveAISettings({ api, secret, model });
  }, [api, secret, model]);

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
          <AutoComplete
            options={
              modelSearch
                ? MODEL_OPTIONS.filter((opt) =>
                    opt.value.toLowerCase().includes(modelSearch.toLowerCase()),
                  )
                : MODEL_OPTIONS
            }
            value={model}
            onChange={(value) => {
              setModel(value);
              setModelSearch(value);
            }}
            onSelect={(value) => {
              setModel(value);
              setModelSearch("");
            }}
            placeholder="选择或输入模型名称"
            style={{ flex: 1, minWidth: 0 }}
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
          style={{ height: 240, borderColor: "#e3e2fe", paddingTop: 8 }}
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

  const handleExcalidrawSubmit = async () => {
    setLoadingExcalidraw(true);
    try {
      saveAISettings({ api, secret, model, prompt: textAreaValue });

      if (!textAreaValue || textAreaValue.trim() === "") {
        console.error("Prompt, model, and endpoint are required");
        message.error(t("other.aiInvalidParams"));
      }

      const requestPrompt = buildExcalidrawPrompt(textAreaValue);
      const { ideas } = await requestCompletions({
        api,
        secret,
        model,
        temperature: 0.6,
        prompt: requestPrompt,
      });
      const content = typeof ideas === "string" ? ideas : JSON.stringify(ideas);
      console.log("AI content: ", content);

      let excalidrawElements: any[] = [];
      let loadedAppState: any = {};

      // Try to parse as direct Excalidraw JSON (array of elements)
      try {
        const cleanContent = content.replace(/```json\n?|\n?```/g, "").trim();
        const parsed = JSON.parse(cleanContent);
        const excalidrawJsonStr = JSON.stringify({
          type: "excalidraw",
          version: 2,
          source: "http://localhost:3000",
          elements: parsed,
        });
        console.log("excalidrawJsonStr: ", excalidrawJsonStr);
        const loaded = await loadFromJSONString(
          excalidrawJsonStr,
          appState,
          null,
          true,
        );
        excalidrawElements = loaded.elements;
        loadedAppState = loaded.appState;
      } catch (e) {
        console.log("Not a direct JSON, err: ", e);
      }

      const elements = excalidrawElements;
      const appStateForFit = { ...appState, ...loadedAppState };
      const nextAppState = elements.length
        ? actionZoomToFit.perform(elements, appStateForFit).appState
        : loadedAppState;

      // Select all elements and set font alignment to middle
      try {
        actionManager.updater({
          elements,
          appState: nextAppState,
          commitToHistory: true,
          syncHistory: true,
        });
      } catch (e) {
        console.error("AI更新场景失败", e);
        message.error(t("other.aiUpdateSceneFailed"));
      }
      setAppState(nextAppState);
      setOpen(false);
    } catch (err) {
      console.error("AI请求失败", err);
      message.error(t("other.aiRequestFailed"));
    } finally {
      setLoadingExcalidraw(false);
    }
  };

  const handleMindSubmit = async () => {
    setLoadingMind(true);
    try {
      saveAISettings({ api, secret, model, prompt: textAreaValue });

      if (!textAreaValue || textAreaValue.trim() === "") {
        console.error("Prompt, model, and endpoint are required");
        message.error(t("other.aiInvalidParams"));
      }

      const requestPrompt = buildMindPrompt(textAreaValue);
      const { ideas } = await requestCompletions({
        api,
        secret,
        model,
        temperature: 0.6,
        prompt: requestPrompt,
      });
      const mermaidStr =
        typeof ideas === "string" ? ideas : JSON.stringify(ideas);
      console.log("mermaidStr: ", mermaidStr);
      const excalidrawJson = await parseMermaidToExcalidraw(mermaidStr);
      const excalidrawJsonStr = JSON.stringify(excalidrawJson);
      console.log("excalidrawJson: ", JSON.stringify(excalidrawJson));
      const { elements, appState: loadedAppState } = await loadFromJSONString(
        excalidrawJsonStr,
        appState,
        null,
        true,
      );

      const appStateForFit = { ...appState, ...loadedAppState };
      const nextAppState = elements.length
        ? actionZoomToFit.perform(elements, appStateForFit).appState
        : loadedAppState;

      try {
        actionManager.updater({
          elements,
          appState: nextAppState,
          commitToHistory: true,
          syncHistory: true,
        });
      } catch (e) {
        console.error("AI更新场景失败", e);
        message.error(t("other.aiUpdateSceneFailed"));
      }
      setAppState(nextAppState);
      setOpen(false);
    } catch (err) {
      console.error("AI请求失败", err);
      message.error(t("other.aiRequestFailed"));
    } finally {
      setLoadingMind(false);
    }
  };

  const handleExtendPrompt = async () => {
    setExtending(true);
    try {
      saveAISettings({ api, secret, model });
      const expandedPrompt = buildExtendPrompt(textAreaValue);
      const { content } = await requestTextCompletions({
        api,
        secret,
        model,
        temperature: 0.3,
        prompt: expandedPrompt,
      });
      if (content.trim()) {
        setTextAreaValue(content);
        message.success(t("other.aiParseSuccess"));
      }
    } catch (err) {
      console.error("AI扩写失败", err);
      message.error(t("other.aiRequestFailed"));
    } finally {
      setExtending(false);
    }
  };

  const handleParsePromptUpload = async (file: File) => {
    const ext = (file.name.split(".").pop() || "").toLowerCase();
    try {
      if (ext === "md" || ext === "txt" || ext === "csv") {
        const text = await file.text();
        setTextAreaValue(text);
        message.success(t("other.aiParseSuccess"));
      } else if (ext === "pdf") {
        const text = await pdfToText(file);
        if (text.trim()) {
          setTextAreaValue(text);
          message.success(t("other.aiPdfParseSuccess"));
        } else {
          message.error(t("other.aiPdfParseFailed"));
        }
      } else {
        message.error(t("other.aiFileSupportError"));
      }
    } catch (e) {
      message.error(t("other.aiParseError"));
      console.error(e);
    }
    return false;
  };

  const footer = (
    <>
      <div
        style={{
          display: "flex",
          flexDirection: isSmallScreen ? "column" : "row",
          justifyContent: "space-between",
          alignItems: isSmallScreen ? "stretch" : "center",
          gap: isSmallScreen ? 8 : 0,
        }}
      >
        <Upload
          showUploadList={false}
          beforeUpload={handleParsePromptUpload}
          accept=".md,.txt,.csv,.pdf"
          maxCount={1}
        >
          <Button
            size="small"
            style={{
              marginRight: 4,
              maxWidth: "160px",
              overflow: "hidden",
              padding: 0,
              whiteSpace: "normal",
              height: "auto",
            }}
          >
            {t("other.aiUploadHint")}
          </Button>
        </Upload>
        <Button
          type="primary"
          size="small"
          style={{
            backgroundColor: "#6965db",
            flex: 1,
            color: "#fff",
          }}
          loading={extending}
          disabled={!textAreaValue.trim() || isAnyLoading}
          onClick={handleExtendPrompt}
        >
          {t("toolBar.aiExpand")}
        </Button>
      </div>
      <div style={{ display: "flex", gap: "4px" }}>
        <Button
          type="primary"
          size={size}
          style={{
            backgroundColor: "#6965db",
            flex: 1,
            color: loadingMind ? "#f0f0f0" : "#fff",
          }}
          loading={loadingExcalidraw}
          disabled={loadingMind}
          onClick={handleExcalidrawSubmit}
        >
          {t("toolBar.aiSimpleFlow")}
        </Button>
        <Button
          type="primary"
          size={size}
          style={{
            backgroundColor: "#6965db",
            flex: 1,
            color: loadingExcalidraw ? "#f0f0f0" : "#fff",
          }}
          loading={loadingMind}
          disabled={loadingExcalidraw}
          onClick={handleMindSubmit}
        >
          {t("toolBar.aiComplexFlow")}
        </Button>
      </div>
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
        width={800}
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
