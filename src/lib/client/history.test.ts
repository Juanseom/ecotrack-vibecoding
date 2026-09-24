import { describe, expect, it } from "vitest";

import { addToHistory, HISTORY_LIMIT, parseHistory } from "@/lib/client/history";
import { sampleResult } from "@/lib/fixtures/sample-result";

const withId = (id: string) => ({ ...sampleResult, id });

describe("historial local", () => {
  it("añade al inicio sin duplicar y respeta el máximo", () => {
    let list = [withId("a"), withId("b")];
    list = addToHistory(list, withId("b"));
    expect(list.map((item) => item.id)).toEqual(["b", "a"]);

    for (let i = 0; i < 15; i++) list = addToHistory(list, withId(`n${i}`));
    expect(list).toHaveLength(HISTORY_LIMIT);
    expect(list[0].id).toBe("n14");
  });

  it("tolera valores corruptos o con forma inesperada", () => {
    expect(parseHistory(null)).toEqual([]);
    expect(parseHistory("{no es json")).toEqual([]);
    expect(parseHistory('{"a":1}')).toEqual([]);
    expect(parseHistory(JSON.stringify([{ id: 1 }, sampleResult]))).toEqual([sampleResult]);
  });
});
