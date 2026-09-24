import { getInterpreter } from "@/lib/interpreters";
import { runPipeline } from "@/lib/pipeline";
import { AnalyzeRequestSchema, MAX_TEXT_LENGTH } from "@/lib/schemas";
import type { StreamEvent } from "@/lib/types";

/**
 * POST /api/analyze — ejecuta el pipeline en el servidor y responde en streaming NDJSON:
 * un `StreamEvent` JSON por línea (progreso de etapas, resultado final o error).
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse({
      type: "error",
      code: "bad_request",
      message: "No pudimos leer tu petición. Vuelve a intentarlo.",
    });
  }

  const parsed = AnalyzeRequestSchema.safeParse(body);
  if (!parsed.success) {
    const text = (body as { text?: unknown } | null)?.text;
    const empty = typeof text !== "string" || text.trim().length === 0;
    return errorResponse(
      empty
        ? {
            type: "error",
            code: "empty_input",
            message: "Escribe algo sobre tu día para poder calcular tu huella.",
          }
        : {
            type: "error",
            code: "bad_request",
            message:
              typeof text === "string" && text.trim().length > MAX_TEXT_LENGTH
                ? "El texto no puede pasar de 1.000 caracteres."
                : "No pudimos procesar tu petición.",
          },
    );
  }

  const { text, mode } = parsed.data;
  const interpreter = getInterpreter(mode);
  const encoder = new TextEncoder();
  const events = runPipeline(text, interpreter);

  const stream = new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        const { value, done } = await events.next();
        if (done) {
          controller.close();
          return;
        }
        controller.enqueue(encoder.encode(`${JSON.stringify(value)}\n`));
      } catch (error) {
        console.error("[api/analyze] Error inesperado en el stream:", error);
        const event: StreamEvent = {
          type: "error",
          code: "internal",
          message: "Algo falló de nuestro lado. Inténtalo de nuevo.",
        };
        controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
        controller.close();
      }
    },
    async cancel() {
      // El cliente se fue (canceló o cerró la pestaña): detenemos el pipeline.
      await events.return(undefined);
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function errorResponse(event: Extract<StreamEvent, { type: "error" }>): Response {
  return Response.json(event, {
    status: 400,
    headers: { "Cache-Control": "no-store" },
  });
}
