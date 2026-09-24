import { describe, expect, it } from "vitest";

// Prueba mínima para verificar que Vitest está configurado.
// Las iteraciones siguientes añadirán pruebas del motor de emisiones.
describe("configuración de pruebas", () => {
  it("ejecuta Vitest correctamente", () => {
    expect(200 * 0.45).toBeCloseTo(90);
  });
});
