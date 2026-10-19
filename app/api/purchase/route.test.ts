/**
 * @jest-environment node
 */
import { beforeEach, describe, expect, it } from "@jest/globals";
import { resetMachine } from "@/lib/machine";
import { POST } from "./route";

beforeEach(() => {
  resetMachine();
});

function post(body: string | undefined) {
  return POST(
    new Request("http://localhost/api/purchase", {
      method: "POST",
      headers: { "content-type": "application/json" },
      ...(body === undefined ? {} : { body }),
    }),
  );
}

describe("POST /api/purchase", () => {
  it("dispenses and returns the change as JSON", async () => {
    const response = await post(JSON.stringify({ customer: "route-ok", price: 60, amountPaid: 100 }));
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    const body = await response.json();
    expect(body.ok).toBe(true);
    expect(body.change).toEqual([{ denomination: 20, count: 2 }]);
  });

  it("answers malformed JSON with 400, not a server error", async () => {
    const response = await post("{oops");
    expect(response.status).toBe(400);
    expect((await response.json()).ok).toBe(false);
  });

  it("answers an empty body with 400", async () => {
    expect((await post(undefined)).status).toBe(400);
  });
});
