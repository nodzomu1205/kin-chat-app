import { useEffect, type RefObject } from "react";

export function useAutoScroll(
  bottomRef: RefObject<HTMLDivElement | null>,
  deps: unknown[]
) {
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "auto", block: "end" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
