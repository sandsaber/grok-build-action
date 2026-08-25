export type GrokStreamEvent = {
  type: string;
  data?: unknown;
  sessionId?: string;
  structured_output?: unknown;
  structuredOutput?: unknown;
  message?: string;
  [key: string]: unknown;
};

export type GrokRunResult = {
  text: string;
  sessionId: string;
  structuredOutput: string;
  error?: string;
};

export function parseStreamLine(line: string): GrokStreamEvent | null {
  const trimmed = line.trim();
  if (!trimmed) {
    return null;
  }
  try {
    return JSON.parse(trimmed) as GrokStreamEvent;
  } catch {
    return { type: "text", data: trimmed };
  }
}

export function reduceStream(events: GrokStreamEvent[]): GrokRunResult {
  let text = "";
  let sessionId = "";
  let structuredOutput = "";
  let error: string | undefined;

  for (const event of events) {
    if (event.type === "text" && typeof event.data === "string") {
      text += event.data;
    }
    if (event.type === "end") {
      if (typeof event.sessionId === "string") {
        sessionId = event.sessionId;
      }
      const structured = event.structured_output ?? event.structuredOutput;
      if (structured !== undefined) {
        structuredOutput = JSON.stringify(structured);
      }
      if (typeof event.data === "string" && !text) {
        text = event.data;
      }
    }
    if (event.type === "error") {
      error = typeof event.message === "string" ? event.message : "grok error";
    }
    if (event.type === "result" && typeof event.result === "string" && !text) {
      text = event.result;
    }
  }

  return { text, sessionId, structuredOutput, error };
}
