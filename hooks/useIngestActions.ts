import type { Dispatch, SetStateAction } from 'react';
import type {
  FileReadPolicy,
  UploadKind,
  ImageDetail,
  IngestMode,
  PostIngestAction,
  ResponseMode,
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
import {
  buildKinSysInfoBlock,
  buildKinSysTaskBlock,
} from '@/lib/app/kinStructuredProtocol';
import {
  buildKinDirectiveLines,
  buildTaskExecutionInstruction,
  parseTransformIntent,
  shouldTransformContent,
  splitTextIntoKinChunks,
  transformTextWithIntent,
} from '@/lib/app/transformIntent';
import type { Message } from '@/types/chat';
import type { TaskDraft } from '@/types/task';
import { generateId } from '@/lib/uuid';
import { normalizeUsage } from '@/lib/tokenStats';


type IngestOptions = {
  kind: UploadKind;
  mode: IngestMode;
  detail: ImageDetail;
  action: PostIngestAction;
  readPolicy: FileReadPolicy;
  compactCharLimit: number;
  simpleImageCharLimit: number;
};

type UsageInput = Parameters<typeof normalizeUsage>[0];

type UseIngestActionsArgs = {
  ingestLoading: boolean;
  setIngestLoading: Dispatch<SetStateAction<boolean>>;
  uploadKind: UploadKind;
  setUploadKind: (kind: UploadKind) => void;
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
  directiveInput?: string;
  setDirectiveInput?: (value: string) => void;
  responseMode?: ResponseMode;
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

function toTransformResponseMode(
  mode?: ResponseMode
): "strict" | "creative" | undefined {
  if (!mode) return undefined;
  return mode;
}

function readDirectiveInputFallback(): string {
  if (typeof document === "undefined") return "";

  const candidates = Array.from(document.querySelectorAll("textarea"));
  const last = candidates.at(-1);
  return last instanceof HTMLTextAreaElement ? last.value.trim() : "";
}

function buildBlocksFromText(args: {
  mode: 'sys_info' | 'sys_task';
  taskSlot?: number;
  title: string;
  sourceLabel?: string;
  content: string;
  directiveLines: string[];
}): string[] {
  if (args.mode === 'sys_task') {
    return [
      buildKinSysTaskBlock({
        taskSlot: args.taskSlot,
        title: args.title,
        content: args.content,
        directiveLines: args.directiveLines,
      }),
    ];
  }

  const chunks = splitTextIntoKinChunks(args.content, 2200);
  const total = chunks.length;

  return chunks.map((chunk, index) =>
    buildKinSysInfoBlock({
      taskSlot: args.taskSlot,
      title: args.title,
      content: chunk,
      directiveLines: args.directiveLines,
      partIndex: index + 1,
      partTotal: total,
    })
  );
}


function buildPlannerWrappedInput(text: string, directiveText: string, defaultMode: 'sys_info' | 'sys_task' = 'sys_info') {
  const intent = parseTransformIntent(directiveText, defaultMode);
  const executionInstruction = buildTaskExecutionInstruction("", intent);

  if (!executionInstruction.trim()) {
    return text;
  }

  return [
    `ユーザー追加指示:`,
    executionInstruction,
    "",
    text,
  ].join("\n");
}

async function maybeTransformDisplayText(args: {
  text: string;
  intentInput: string;
  responseMode?: ResponseMode;
}) {
  const intent = parseTransformIntent(args.intentInput, "sys_info");
  if (!shouldTransformContent(intent)) {
    return { text: args.text, usage: null as UsageInput | null };
  }

  const transformed = await transformTextWithIntent({
  text: args.text,
  intent,
  responseMode: toTransformResponseMode(args.responseMode),
});

  return {
    text: transformed.text.trim() || args.text,
    usage: transformed.usage as UsageInput | null,
  };
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
  directiveInput,
  setDirectiveInput,
  responseMode,
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
      form.append('compactCharLimit', String(options.compactCharLimit));
      form.append('simpleImageCharLimit', String(options.simpleImageCharLimit));

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

      const title =
        typeof data?.result?.title === 'string' && data.result.title.trim()
          ? data.result.title
          : file.name;

      const liveDirectiveInput = (directiveInput || '').trim() || readDirectiveInputFallback();
      const intent = parseTransformIntent(liveDirectiveInput, 'sys_info');
      let prepInput = buildPrepInputFromIngestResult(data, file.name);
      let effectiveContent = prepInput;

      if (shouldTransformContent(intent)) {
        try {
          const transformed = await transformTextWithIntent({
            text: prepInput,
            intent,
            responseMode: toTransformResponseMode(responseMode),
          });
          effectiveContent = transformed.text.trim() || prepInput;
          prepInput = effectiveContent;
          applyTaskUsage(transformed.usage);
        } catch (error) {
          console.error('file transform failed', error);
          setGptMessages((prev) => [
            ...prev,
            {
              id: generateId(),
              role: 'gpt',
              text: '⚠️ ファイル方向性指示の反映に失敗したため、元の取込内容で続行しました。',
              meta: {
                kind: 'task_info',
                sourceType: 'file_ingest',
              },
            },
          ]);
        }
      }

      const directiveLines = buildKinDirectiveLines(intent);
      const blocks: string[] =
        shouldTransformContent(intent) || directiveLines.length > 0
          ? buildBlocksFromText({
              mode: intent.mode,
              taskSlot: 1,
              title: title || file.name,
              content: effectiveContent,
              directiveLines,
            })
          : Array.isArray(data?.kinBlocks)
            ? data.kinBlocks
            : [];

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
      setDirectiveInput?.('');

      let prepTaskText = '';
      let deepenTaskText = '';

      if (
        options.action === 'inject_and_prep' ||
        options.action === 'inject_prep_deepen'
      ) {
        try {
          const prepData = await runAutoPrepTask(
            buildPlannerWrappedInput(prepInput, liveDirectiveInput, intent.mode),
            `ingest-${file.name}`
          );
          prepTaskText = formatTaskResultText(prepData?.parsed, prepData?.raw);
          applyTaskUsage(prepData?.usage);

          const transformedPrep = await maybeTransformDisplayText({
            text: prepTaskText,
            intentInput: liveDirectiveInput,
            responseMode,
          });
          prepTaskText = transformedPrep.text;
          applyTaskUsage(transformedPrep.usage);

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

              const transformedDeepen = await maybeTransformDisplayText({
                text: deepenTaskText,
                intentInput: liveDirectiveInput,
                responseMode,
              });
              deepenTaskText = transformedDeepen.text;
              applyTaskUsage(transformedDeepen.usage);
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
        directiveLines.length > 0
          ? `方向性指示: ${directiveLines.join(' / ')}`
          : '',
        '',
        `Kin入力欄に 1/${blocks.length} をセットしました。送信後は次パートが自動で下書きに入ります。`,
      ].filter(Boolean);

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
              userInstruction: buildTaskExecutionInstruction(
                currentTaskDraft.userInstruction,
                intent
              ),
              searchRawText: currentTaskDraft.searchContext?.rawText || '',
            }
          );

          try {
            const mergeData = await runAutoPrepTask(
              buildPlannerWrappedInput(mergedInput, liveDirectiveInput, intent.mode),
              `attach-${file.name}`
            );
            let mergedTaskText = formatTaskResultText(
              mergeData?.parsed,
              mergeData?.raw
            );

            applyTaskUsage(mergeData?.usage);

            const transformedMerged = await maybeTransformDisplayText({
              text: mergedTaskText,
              intentInput: liveDirectiveInput,
              responseMode,
            });
            mergedTaskText = transformedMerged.text;
            applyTaskUsage(transformedMerged.usage);

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
