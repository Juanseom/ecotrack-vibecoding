import { describe, expect, it } from "vitest";

import {
  firstWords,
  formatAmount,
  formatKg,
  formatNumber,
  formatShare,
  receiptNumber,
} from "@/lib/format";

describe("formato es-CO", () => {
  it("agrupa miles con punto y usa coma decimal", () => {
    expect(formatNumber(290 / 0.17)).toBe("1.706");
    expect(formatNumber(290 / 21, 1)).toBe("13,8");
    expect(formatKg(290)).toBe("290,0");
    expect(formatAmount(0.25)).toBe("0,25");
    expect(formatAmount(800)).toBe("800");
  });

  it("muestra porcentajes enteros", () => {
    expect(formatShare(200 / 290)).toBe("69 %");
  });

  it("genera un número de recibo corto y estable", () => {
    expect(receiptNumber("demo-7f3a21c4")).toBe("7F3A-21C4");
    expect(receiptNumber("ab")).toBe("0000-00AB");
  });

  it("recorta a las primeras palabras", () => {
    expect(firstWords("uno dos tres", 2)).toBe("uno dos…");
    expect(firstWords("  uno dos  ", 5)).toBe("uno dos");
  });
});
