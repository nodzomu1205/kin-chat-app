export const GPT_GOOGLE_DRIVE_TEXT = {
  cardActions: {
    showInChat: "チャットに表示",
    sendToKin: "Kin に送付",
    uploadToDrive: "Google Drive にアップロード",
  },
  settings: {
    title: "Google Drive 連携",
    folderLinkLabel: "共有フォルダーリンク",
    folderLinkHelp:
      "共有可能な Google Drive フォルダーのリンクを保存します。Picker 接続時は、このフォルダーを起点にファイルやフォルダーを選べます。",
    folderIdLabel: "フォルダー ID",
    integrationModeLabel: "接続モード",
    integrationModeManual: "manual-link",
    integrationModePicker: "picker",
    openFolder: "Google Drive フォルダーを開く",
    importEntry: "Google Drive から取り込む",
    importFile: "ファイルを選択して取り込む",
    indexFolder: "フォルダーを選択して目次を取得",
    importFolder: "フォルダーを選択して一括取り込む",
    importHelp:
      "ライブラリタブでは、Google Drive の入口からファイル取込、フォルダー目次取得、フォルダー一括取込を選べます。",
  },
} as const;
