import { parseConfiguration, type ConfigurationV1 } from '../../domain/configuration';

/**
 * Link for the AR entry page (SW-07, 2 Oct 2026): the configuration itself travels in the URL (deflate-raw +
 * base64url), so a QR on the desktop opens exactly this design on a phone without a server, a database or
 * stored files. The phone validates it with the normal schema; nothing in the link is trusted beyond that.
 * The link is a snapshot: later edits on the desktop produce a new QR.
 */
export const AR_LINK_PARAM = 'ar';
const VERSION_PREFIX = '1.';
/** Generous bounds for one configuration; anything larger is rejected before and after decompression. */
const MAX_PAYLOAD_CHARS = 6000;
const MAX_JSON_BYTES = 64 * 1024;

export type ArLinkDecode =
  | { status: 'ok'; configuration: ConfigurationV1 }
  | { status: 'invalid' | 'unsupported_version' | 'too_large' };

export async function encodeArPayload(configuration: ConfigurationV1): Promise<string> {
  const json = new TextEncoder().encode(JSON.stringify(configuration));
  const compressed = await transform(json, new CompressionStream('deflate-raw'));
  if (!compressed) throw new Error('compression_failed');
  return VERSION_PREFIX + toBase64Url(compressed);
}

export async function createArLink(configuration: ConfigurationV1, pageUrl: string): Promise<string> {
  const url = new URL(pageUrl);
  url.search = '';
  url.hash = '';
  url.searchParams.set(AR_LINK_PARAM, await encodeArPayload(configuration));
  return url.toString();
}

export async function decodeArPayload(payload: string): Promise<ArLinkDecode> {
  if (payload.length > MAX_PAYLOAD_CHARS) return { status: 'too_large' };
  if (!payload.startsWith(VERSION_PREFIX)) return { status: 'unsupported_version' };
  try {
    const bytes = await transform(fromBase64Url(payload.slice(VERSION_PREFIX.length)), new DecompressionStream('deflate-raw'), MAX_JSON_BYTES);
    if (!bytes) return { status: 'too_large' };
    const parsed = parseConfiguration(JSON.parse(new TextDecoder().decode(bytes)));
    if (!parsed.ok) return { status: parsed.reason === 'unsupported_version' ? 'unsupported_version' : 'invalid' };
    return { status: 'ok', configuration: parsed.configuration };
  } catch {
    return { status: 'invalid' };
  }
}

/** Runs bytes through a (de)compression stream; stops and returns null once `limit` bytes are exceeded. */
async function transform(input: Uint8Array, stream: CompressionStream | DecompressionStream, limit = Infinity): Promise<Uint8Array | null> {
  const writer = stream.writable.getWriter();
  void writer.write(input as Uint8Array<ArrayBuffer>).then(() => writer.close()).catch(() => undefined);
  const reader = stream.readable.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > limit) { void reader.cancel(); return null; }
    chunks.push(value);
  }
  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) { out.set(chunk, offset); offset += chunk.byteLength; }
  return out;
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(text: string): Uint8Array {
  if (!/^[A-Za-z0-9_-]*$/.test(text)) throw new TypeError('not base64url');
  const padded = text.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (text.length % 4)) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}
