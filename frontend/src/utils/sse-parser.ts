export interface SseEvent {
  event: string;
  data: string;
  id?: string;
}

/**
 * Parse a ReadableStream of SSE bytes into complete events. Buffers across
 * chunks so an event split mid-way (common over the wire) still arrives whole.
 * Blank line (`\n\n`) terminates an event, per the EventSource spec.
 */
export async function* parseSseStream(body: ReadableStream<Uint8Array>): AsyncGenerator<SseEvent> {
  const reader = body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';

  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      let boundary = buffer.indexOf('\n\n');
      while (boundary !== -1) {
        const raw = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + 2);
        const event = parseEventBlock(raw);
        if (event) yield event;
        boundary = buffer.indexOf('\n\n');
      }
    }
    const tail = buffer.trim();
    if (tail) {
      const event = parseEventBlock(tail);
      if (event) yield event;
    }
  } finally {
    reader.releaseLock();
  }
}

function parseEventBlock(raw: string): SseEvent | null {
  let eventName = 'message';
  let id: string | undefined;
  const dataLines: string[] = [];

  for (const line of raw.split('\n')) {
    if (!line || line.startsWith(':')) continue;
    const colon = line.indexOf(':');
    const field = colon === -1 ? line : line.slice(0, colon);
    const value = colon === -1 ? '' : line.slice(colon + 1).replace(/^ /, '');

    if (field === 'event') eventName = value;
    else if (field === 'data') dataLines.push(value);
    else if (field === 'id') id = value;
  }

  if (dataLines.length === 0) return null;
  return { event: eventName, data: dataLines.join('\n'), id };
}
