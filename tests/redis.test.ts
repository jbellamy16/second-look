import { afterAll, expect, it, vi } from "vitest";
import { createClient } from "@redis/client";
import { randomUUID } from "node:crypto";
import { CLAIM_SCRIPT, FINISH_SCRIPT } from "../src/lib/ai/controls";
const url = process.env.REDIS_TEST_URL;
it.skipIf(!url)(
  "real Redis atomically enforces shared quotas, locks, cache and cooldown across clients",
  async () => {
    const a = await createClient({ url }).connect();
    const b = await createClient({ url }).connect();
    const prefix = `{second-look-test-${randomUUID()}}`;
    const budget = `${prefix}:budget`;
    const keys = (id: string) => [
      `${prefix}:cache:${id}`,
      `${prefix}:lock:${id}`,
      budget,
    ];
    const args = ["2", "2", "2", "2", "owner"];
    try {
      const outcomes = await Promise.all(
        Array.from({ length: 10 }, (_, i) =>
          (i % 2 ? a : b).eval(CLAIM_SCRIPT, {
            keys: keys(String(i)),
            arguments: args,
          }),
        ),
      );
      expect(
        outcomes.filter((r) => (r as string[])[0] === "acquired"),
      ).toHaveLength(2);
      expect(await a.hGet(budget, "used4")).toBe("2");
      const acquired = outcomes.findIndex(
        (r) => (r as string[])[0] === "acquired",
      );
      const key = keys(String(acquired));
      expect(
        await b.eval(CLAIM_SCRIPT, { keys: key, arguments: args }),
      ).toEqual(["busy"]);
      expect(
        await b.eval(FINISH_SCRIPT, {
          keys: key,
          arguments: ["wrong-owner", "fake"],
        }),
      ).toBe(0);
      await a.eval(FINISH_SCRIPT, {
        keys: key,
        arguments: ["owner", "verified"],
      });
      expect(
        await b.eval(CLAIM_SCRIPT, { keys: key, arguments: args }),
      ).toEqual(["cached", "verified"]);
      const other = outcomes.findIndex(
        (r, i) => i !== acquired && (r as string[])[0] === "acquired",
      );
      await a.eval(FINISH_SCRIPT, {
        keys: keys(String(other)),
        arguments: ["owner", ""],
      });
      expect(await b.ttl(keys(String(other))[1])).toBeLessThanOrEqual(5);
      expect(await b.hGet(budget, "used4")).toBe("2");
    } finally {
      await a.del([
        budget,
        ...Array.from({ length: 10 }, (_, i) =>
          keys(String(i)).slice(0, 2),
        ).flat(),
      ]);
      a.destroy();
      b.destroy();
    }
  },
);
afterAll(() => vi.unstubAllEnvs());
