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
      "共有可能な Google Drive フォルダーリンクを保存します。現在は manual-link mode で、フォルダーを開く導線を優先します。",
    folderIdLabel: "フォルダー ID",
    integrationModeLabel: "接続モード",
    integrationModeManual: "manual-link",
    integrationModePicker: "picker",
    openFolder: "Google Drive フォルダーを開く",
    importFromDrive: "Google Drive からのファイルインポート",
    importHelp:
      "本日の実装では共有フォルダー導線を先に通しています。OAuth / Picker 追加後にフォルダー選択と直接インポートを拡張できます。",
  },
} as const;
