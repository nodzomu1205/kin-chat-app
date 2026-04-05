import type { Dispatch, SetStateAction } from 'react';
import type {
  FileReadPolicy,
  FileUploadKind,
  ImageDetail,
  IngestMode,
  PostIngestAction,
} from '@/components/panels/gpt/gptPanelTypes';
import {
  buildMergedTaskInput,
  buildPrepInputFromIngestResult,
  formatTaskResultText,
  resolveUploadKindFromFile,
  runAutoDeepenTask,
  runAutoPrepTask,
} from '@/lib/app/gptTaskClient';
import {
  createTaskSource,
  resolveTaskName,
} from '@/lib/app/taskDraftHelpers';
import type { Message } from '@/types/chat';
import type { TaskDraft } from '@/types/task';
import { generateId } from '@/lib/uuid';
import { normalizeUsage } from '@/lib/tokenStats';


type IngestOptions = {
  kind: FileUploadKind;
  mode: IngestMode;
  detail: ImageDetail;
  action: PostIngestAction;
  readPolicy: FileReadPolicy;
};

type UsageInput = Parameters<typeof normalizeUsage>[0];

type UseIngestActionsArgs = {
  ingestLoading: boolean;
  setIngestLoading: Dispatch<SetStateAction<boolean>>;
  uploadKind: FileUploadKind;
  setUploadKind: (kind: FileUploadKind) => void;
  ingestMode: IngestMode;
  imageDetail: ImageDetail;
  fileReadPolicy: FileReadPolicy;
  currentTaskDraft: TaskDraft;
  setCurrentTaskDraft: Dispatch<SetStateAction<TaskDraft>>;
  gptMessages: Message[];
  setGptMessages: Dispatch<SetStateAction<Message[]>>;
  applyIngestUsage: (usage: UsageInput) => void;
  applyTaskUsage: (usage: UsageInput) => void;
  setPendingKinInjectionBlocks: Dispatch<SetStateAction<string[]>>;
  setPendingKinInjectionIndex: Dispatch<SetStateAction<number>>;
  setKinInput: (value: string) => void;
  isMobile: boolean;
  onSwitchToKin: () => void;
  getTaskBaseText: () => string;
};

function resolveReadPolicyLabel(policy: FileReadPolicy): string {
  if (policy === 'text_first') return '文字優先';
  if (policy === 'visual_first') return '視覚優先';
  return '統合';
}

function resolveActionLabel(action: PostIngestAction): string {
  if (action === 'inject_only') return '注入のみ';
  if (action === 'inject_and_prep') return '注入＋タスク整理';
  if (action === 'inject_prep_deepen') return '注入＋タスク整理＋深掘り';
  return '現在タスクに追加';
}

export function useIngestActions({
  ingestLoading,
  setIngestLoading,
  setUploadKind,
  currentTaskDraft,
  setCurrentTaskDraft,
  setGptMessages,
  applyIngestUsage,
  applyTaskUsage,
  setPendingKinInjectionBlocks,
  setPendingKinInjectionIndex,
  setKinInput,
  isMobile,
  onSwitchToKin,
  getTaskBaseText,
}: UseIngestActionsArgs) {
  const injectFileToKinDraft = async (file: File, options: IngestOptions) => {
    if (ingestLoading) return;

    const resolvedKind = resolveUploadKindFromFile(file, options.kind);
    setIngestLoading(true);

    try {
      const form = new FormData();
      form.append('file', file);
      form.append('kind', resolvedKind);
      form.append('mode', options.mode);
      form.append('detail', options.detail);
      form.append('readPolicy', options.readPolicy);

      const res = await fetch('/api/ingest', {
        method: 'POST',
        body: form,
      });

      const data = await res.json();

      if (!res.ok) {
        const errorText =
          typeof data?.error === 'string'
            ? data.error
            : '⚠️ ファイル変換に失敗しました';

        setGptMessages((prev) => [
          ...prev,
          {
            id: generateId(),
            role: 'gpt',
            text:
              `${errorText}\n\n` +
              '必要なら /api/ingest のレスポンス詳細を確認してください。',
          },
        ]);
        return;
      }

      applyIngestUsage(data?.usage);

      const blocks: string[] = Array.isArray(data?.kinBlocks) ? data.kinBlocks : [];
      if (blocks.length === 0) {
        setGptMessages((prev) => [
          ...prev,
          {
            id: generateId(),
            role: 'gpt',
            text: '⚠️ Kin注入用ブロックを生成できませんでした',
          },
        ]);
        return;
      }

      setPendingKinInjectionBlocks(blocks);
      setPendingKinInjectionIndex(0);
      setKinInput(blocks[0]);
      setUploadKind(resolvedKind);

      const prepInput = buildPrepInputFromIngestResult(data, file.name);
      let prepTaskText = '';
      let deepenTaskText = '';

      if (
        options.action === 'inject_and_prep' ||
        options.action === 'inject_prep_deepen'
      ) {
        try {
          const prepData = await runAutoPrepTask(prepInput, `ingest-${file.name}`);
          prepTaskText = formatTaskResultText(prepData?.parsed, prepData?.raw);
          applyTaskUsage(prepData?.usage);

          if (options.action === 'inject_prep_deepen') {
            try {
              const deepenData = await runAutoDeepenTask(
                prepTaskText,
                `prep-${file.name}`
              );
              deepenTaskText = formatTaskResultText(
                deepenData?.parsed,
                deepenData?.raw
              );
              applyTaskUsage(deepenData?.usage);
            } catch (error) {
              console.error('auto deepen task failed', error);
              deepenTaskText = '⚠️ 自動深掘りに失敗しました';
            }
          }
        } catch (error) {
          console.error('auto prep task failed', error);
          prepTaskText = '⚠️ 抽出後の自動タスク整理に失敗しました';
        }
      }

      const title =
        typeof data?.result?.title === 'string' && data.result.title.trim()
          ? data.result.title
          : file.name;

      const modeLine =
        resolvedKind === 'text'
          ? `テキスト注入: ${options.mode}`
          : `画像詳細度: ${options.detail}`;

      const messageParts = [
        'ファイルをKin注入用テキストに変換しました。',
        `タイトル: ${title}`,
        `対象: ${resolvedKind === 'text' ? 'テキスト' : '画像 / PDF'}`,
        `読込方針: ${resolveReadPolicyLabel(options.readPolicy)}`,
        modeLine,
        `注入後処理: ${resolveActionLabel(options.action)}`,
        `分割数: ${blocks.length}`,
        '',
        `Kin入力欄に 1/${blocks.length} をセットしました。送信後は次パートが自動で下書きに入ります。`,
      ];

      if (options.action === 'inject_only') {
        messageParts.push('', '--------------------', '【取込内容】', prepInput);
      }

      if (options.action !== 'inject_only' && prepTaskText) {
        messageParts.push('', '--------------------', prepTaskText);
      }

      if (options.action === 'inject_prep_deepen' && deepenTaskText) {
        messageParts.push('', '====================', '【自動深掘り結果】', deepenTaskText);
      }

      setGptMessages((prev) => [
        ...prev,
        {
          id: generateId(),
          role: 'gpt',
          text: messageParts.join('\n'),
          meta: {
            kind: 'task_info',
            sourceType: 'file_ingest',
          },
        },
      ]);

      if (options.action === 'attach_to_current_task') {
        const currentTaskText = getTaskBaseText();

        if (!currentTaskText) {
          setGptMessages((prev) => [
            ...prev,
            {
              id: generateId(),
              role: 'gpt',
              text:
                '⚠️ 現在タスクが未作成のため、ファイルを追加統合できません。先にタスク整理を行ってください。',
            },
          ]);
        } else {
          const mergedInput = buildMergedTaskInput(
            currentTaskText,
            `FILE: ${file.name}`,
            prepInput,
            {
              title: currentTaskDraft.title || title || file.name,
              userInstruction: currentTaskDraft.userInstruction,
              searchRawText: currentTaskDraft.searchContext?.rawText || '',
            }
          );

          try {
            const mergeData = await runAutoPrepTask(
              mergedInput,
              `attach-${file.name}`
            );
            const mergedTaskText = formatTaskResultText(
              mergeData?.parsed,
              mergeData?.raw
            );

            applyTaskUsage(mergeData?.usage);

            setGptMessages((prev) => [
              ...prev,
              {
                id: generateId(),
                role: 'gpt',
                text: ['【現在タスク更新結果】', mergedTaskText].join('\n\n'),
                meta: {
                  kind: 'task_prep',
                  sourceType: 'file_ingest',
                },
              },
            ]);

            const source = createTaskSource(
              'file_ingest',
              `FILE: ${file.name}`,
              prepInput
            );

            setCurrentTaskDraft((prev) => ({
              ...prev,
              taskName: resolveTaskName(prev, title || file.name),
              title: resolveTaskName(prev, title || file.name),
              body: mergedTaskText,
              objective: prev.objective || `ファイル ${file.name} を統合したタスク`,
              deepenText: '',
              mergedText: mergedTaskText,
              kinTaskText: '',
              status: 'prepared',
              sources: [...prev.sources, source],
              updatedAt: new Date().toISOString(),
            }));
          } catch (error) {
            console.error('attach current task failed', error);
            setGptMessages((prev) => [
              ...prev,
              {
                id: generateId(),
                role: 'gpt',
                text: '⚠️ ファイル内容の現在タスクへの統合に失敗しました',
              },
            ]);
          }
        }
      }

      const source = createTaskSource('file_ingest', `FILE: ${file.name}`, prepInput);

      if (options.action === 'inject_and_prep' && prepTaskText) {
        setCurrentTaskDraft((prev) => ({
          ...prev,
          taskName: title || file.name,
          title: title || file.name,
          body: prepTaskText,
          objective: `ファイル ${file.name} の整理`,
          prepText: prepTaskText,
          deepenText: '',
          mergedText: prepTaskText,
          kinTaskText: '',
          status: 'prepared',
          sources: [...prev.sources, source],
          updatedAt: new Date().toISOString(),
        }));
      }

      if (options.action === 'inject_prep_deepen') {
        const finalText = deepenTaskText || prepTaskText;
        if (finalText) {
          setCurrentTaskDraft((prev) => ({
            ...prev,
            taskName: title || file.name,
            title: title || file.name,
            body: finalText,
            objective: `ファイル ${file.name} の整理`,
            prepText: prepTaskText,
            deepenText: deepenTaskText,
            mergedText: finalText,
            kinTaskText: '',
            status: deepenTaskText ? 'deepened' : 'prepared',
            sources: [...prev.sources, source],
            updatedAt: new Date().toISOString(),
          }));
        }
      }

      if (isMobile) {
        onSwitchToKin();
      }
    } catch (error) {
      console.error(error);
      setGptMessages((prev) => [
        ...prev,
        {
          id: generateId(),
          role: 'gpt',
          text: '⚠️ ファイル変換中にエラーが発生しました',
        },
      ]);
    } finally {
      setIngestLoading(false);
    }
  };

  return {
    injectFileToKinDraft,
  };
}
