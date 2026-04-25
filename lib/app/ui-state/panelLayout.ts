export type ChatPanelTab = "kin" | "gpt";
export type ChatPanelFocusHandler = () => boolean;

export function normalizeSinglePanelActiveTab(params: {
  isSinglePanelLayout: boolean;
  activeTab: ChatPanelTab;
}) {
  if (!params.isSinglePanelLayout) {
    return params.activeTab;
  }

  return params.activeTab === "gpt" ? "gpt" : "kin";
}

export function focusPanelIfSingleLayout(params: {
  isSinglePanelLayout: boolean;
  setActiveTab: (tab: ChatPanelTab) => void;
  tab: ChatPanelTab;
}) {
  if (!params.isSinglePanelLayout) {
    return false;
  }

  params.setActiveTab(params.tab);
  return true;
}

export function buildSinglePanelFocusHandler(params: {
  isSinglePanelLayout: boolean;
  setActiveTab: (tab: ChatPanelTab) => void;
  tab: ChatPanelTab;
}) {
  if (!params.isSinglePanelLayout) {
    return undefined;
  }

  return () => params.setActiveTab(params.tab);
}
