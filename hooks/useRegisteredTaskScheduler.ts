"use client";

import { useEffect, useRef } from "react";
import { GPT_TASK_TEXT } from "@/components/panels/gpt/gptUiText";
import type { RegisteredTask } from "@/lib/app/task-registration/taskRegistration";

type RegisteredTaskSchedulerArgs = {
  registeredTasks: RegisteredTask[];
  onStartRegisteredTask: (task: RegisteredTask) => void;
};

const WEEKDAY_INDEX_TO_LABEL_INDEX = [6, 0, 1, 2, 3, 4, 5];

function getCurrentScheduleKey(date: Date, task: RegisteredTask, time: string) {
  const dayKey = date.toISOString().slice(0, 10);
  return `${dayKey}:${task.id}:${time}`;
}

function getCurrentWeekdayLabel(date: Date) {
  return GPT_TASK_TEXT.registration.weekdays[
    WEEKDAY_INDEX_TO_LABEL_INDEX[date.getDay()] ?? 0
  ];
}

function getCurrentTimeLabel(date: Date) {
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

export function useRegisteredTaskScheduler({
  registeredTasks,
  onStartRegisteredTask,
}: RegisteredTaskSchedulerArgs) {
  const firedKeysRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const weekday = getCurrentWeekdayLabel(now);
      const currentTime = getCurrentTimeLabel(now);

      registeredTasks.forEach((task) => {
        if (task.recurrence.mode !== "repeat") return;
        if (!task.recurrence.weekdays.includes(weekday)) return;
        if (!task.recurrence.times.includes(currentTime)) return;

        const key = getCurrentScheduleKey(now, task, currentTime);
        if (firedKeysRef.current.has(key)) return;
        firedKeysRef.current.add(key);
        onStartRegisteredTask(task);
      });
    };

    tick();
    const interval = window.setInterval(tick, 30000);
    return () => window.clearInterval(interval);
  }, [onStartRegisteredTask, registeredTasks]);
}
