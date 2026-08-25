import { describe, expect, test } from "bun:test";
import { parseStreamLine, reduceStream } from "../src/grok/stream";

describe("grok stream parser", () => {
  test("parses NDJSON events and concatenates text", () => {
    const events = [
      '{"type":"text","data":"Hello "}',
      '{"type":"text","data":"world"}',
      '{"type":"end","sessionId":"abc-123","structured_output":{"ok":true}}',
    ].map((line) => parseStreamLine(line)!);

    const result = reduceStream(events);
    expect(result.text).toBe("Hello world");
    expect(result.sessionId).toBe("abc-123");
    expect(result.structuredOutput).toBe('{"ok":true}');
    expect(result.error).toBeUndefined();
  });

  test("captures error events", () => {
    const result = reduceStream([parseStreamLine('{"type":"error","message":"auth failed"}')!]);
    expect(result.error).toBe("auth failed");
  });

  test("treats non-JSON lines as text", () => {
    const event = parseStreamLine("plain leftover");
    expect(event).toEqual({ type: "text", data: "plain leftover" });
  });
});
