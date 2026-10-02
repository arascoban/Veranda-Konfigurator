import { describe, expect, it } from 'vitest';
import { createDefaultConfiguration } from '../../domain/configuration';
import { addToField, listFields } from '../../domain/fieldEquipment';
import { createArLink, decodeArPayload, encodeArPayload } from './arLink';

describe('AR link', () => {
  it('round-trips a configuration with equipment through the URL', async () => {
    const base = createDefaultConfiguration();
    const configuration = addToField(base, listFields(base)[0].id, 'glasschiebewand')!;
    const link = await createArLink(configuration, 'https://konfigurator.example/?foo=1#x');
    const url = new URL(link);
    expect([...url.searchParams.keys()]).toEqual(['ar']);
    expect(url.hash).toBe('');
    const decoded = await decodeArPayload(url.searchParams.get('ar')!);
    expect(decoded).toEqual({ status: 'ok', configuration });
  });

  it('stays short enough for a phone-readable QR code', async () => {
    const payload = await encodeArPayload(createDefaultConfiguration());
    // QR version ≤ 25 at error level L holds well over 1000 bytes; the default draft needs far less.
    expect(payload.length).toBeLessThan(700);
  });

  it('rejects tampered, foreign or oversized payloads', async () => {
    expect((await decodeArPayload('1.@@@')).status).toBe('invalid');
    expect((await decodeArPayload('2.abc')).status).toBe('unsupported_version');
    expect((await decodeArPayload('1.' + 'A'.repeat(7000))).status).toBe('too_large');
    const json = new TextEncoder().encode(JSON.stringify({ hello: 'world' }));
    const stream = new CompressionStream('deflate-raw');
    const writer = stream.writable.getWriter();
    void writer.write(json).then(() => writer.close());
    const bytes = new Uint8Array(await new Response(stream.readable).arrayBuffer());
    const foreign = '1.' + btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    expect((await decodeArPayload(foreign)).status).not.toBe('ok');
  });
});
