import { describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/task/route";
import { handleTaskRoute } from "@/lib/server/task/routeHandlers";
import type { NextRequest } from "next/server";

vi.mock("@/lib/server/task/routeHandlers", () => ({
  handleTaskRoute: vi.fn(),
}));

const mockedHandleTaskRoute = vi.mocked(handleTaskRoute);

function buildRequest(body: unknown) {
  return new Request("http://localhost/api/task", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as NextRequest;
}

describe("/api/task route", () => {
  it("returns a JSON error when the async task handler rejects", async () => {
    mockedHandleTaskRoute.mockRejectedValueOnce(new Error("slide count invalid"));

    const response = await POST(buildRequest({ task: { taskId: "TASK-1" } }));

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: "slide count invalid" });
  });
});
