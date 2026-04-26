export function buildTaskFormationIntent(title: string) {
  return `タスクを形成: ${title}`;
}

export function buildTaskUpdateIntent(title: string) {
  return `タスクを更新: ${title}`;
}

export function buildLatestGptTaskUpdateIntent(title: string) {
  return `最新GPTレスからタスクを更新: ${title}`;
}

export function buildTaskDeepenIntent(title: string) {
  return `タスクを深掘り: ${title}`;
}

export function buildLibraryTaskFormationIntent(title: string) {
  return `ライブラリ項目「${title}」からタスクを形成`;
}

export function buildLibraryTaskAttachIntent(title: string) {
  return `ライブラリ項目「${title}」をタスクに追加`;
}
