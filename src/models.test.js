import { describe, it, expect } from "vitest";
import { MODELS, findModel, isValidModelId } from "./models.js";

describe("MODELS catalog", () => {
  it("has at least 10 entries", () => {
    expect(MODELS.length).toBeGreaterThanOrEqual(10);
  });

  it("every entry has id and label", () => {
    for (const m of MODELS) {
      expect(m.id).toBeTypeOf("string");
      expect(m.id.length).toBeGreaterThan(0);
      expect(m.label).toBeTypeOf("string");
      expect(m.label.length).toBeGreaterThan(0);
    }
  });

  it("ids are unique", () => {
    const ids = MODELS.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("findModel returns entry by id", () => {
    const first = MODELS[0];
    expect(findModel(first.id)).toEqual(first);
  });

  it("findModel returns undefined for unknown id", () => {
    expect(findModel("nope-not-a-real-id")).toBeUndefined();
  });

  it("isValidModelId rejects unknown ids", () => {
    expect(isValidModelId("definitely-not-real")).toBe(false);
    expect(isValidModelId(MODELS[0].id)).toBe(true);
  });
});
