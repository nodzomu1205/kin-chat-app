export type KinPanelVisibilityState = {
  showKinList: boolean;
  showConnectForm: boolean;
};

type KinPanelVisibilityContext = {
  isMobile: boolean;
  kinCount: number;
};

export function createInitialKinPanelVisibility(
  context: KinPanelVisibilityContext
): KinPanelVisibilityState {
  return {
    showKinList: !context.isMobile,
    showConnectForm: !context.isMobile || context.kinCount === 0,
  };
}

export function resolveKinPanelVisibility(
  state: KinPanelVisibilityState,
  context: KinPanelVisibilityContext
): KinPanelVisibilityState {
  if (!context.isMobile) {
    return state;
  }

  if (context.kinCount === 0) {
    return {
      ...state,
      showConnectForm: true,
    };
  }

  return state;
}

export function toggleKinPanelListVisibility(
  state: KinPanelVisibilityState
): KinPanelVisibilityState {
  return {
    ...state,
    showKinList: !state.showKinList,
  };
}

export function toggleKinPanelConnectVisibility(
  state: KinPanelVisibilityState,
  context: KinPanelVisibilityContext
): KinPanelVisibilityState {
  if (context.isMobile && context.kinCount === 0) {
    return {
      ...state,
      showConnectForm: true,
    };
  }

  return {
    ...state,
    showConnectForm: !state.showConnectForm,
  };
}

export function shouldShowKinManagementDrawer(
  visibility: KinPanelVisibilityState
) {
  return visibility.showKinList || visibility.showConnectForm;
}

export function getKinLoadingText(loading: boolean) {
  return loading ? "Kindroidが応答中..." : null;
}

export function getKinPendingInjectionLabel(params: {
  currentPart: number;
  totalParts: number;
}) {
  return `注入送信中 ${params.currentPart}/${params.totalParts}`;
}
