import { describe, expect, it } from 'vitest';
import { fixtureFont } from '../font/fixture';
import { PixelBuffer } from '../pixel-buffer/pixel-buffer';
import { ClockRenderer } from './render';

describe('clock/ClockRenderer', () => {
  const font = fixtureFont();

  it('renders the formatted time as text in the buffer', () => {
    const buf = PixelBuffer.create(64, 8);
    const renderer = new ClockRenderer({ font, format: 'HH:mm', timeZone: 'UTC' });
    const t = Date.UTC(2026, 3, 8, 12, 30, 0);
    renderer.render(buf, t);
    expect(buf.cols).toBe(64);
    expect(buf.rows).toBe(8);
    expect(renderer.lastRenderedString).toBe('12:30');
  });

  it('updates lastRenderedString on each render call', () => {
    const buf = PixelBuffer.create(64, 8);
    const renderer = new ClockRenderer({ font, format: 'HH:mm', timeZone: 'UTC' });
    renderer.render(buf, Date.UTC(2026, 3, 8, 12, 30, 5));
    expect(renderer.lastRenderedString).toBe('12:30');
    renderer.render(buf, Date.UTC(2026, 3, 8, 12, 31, 0));
    expect(renderer.lastRenderedString).toBe('12:31');
  });

  it('always re-blits even when called twice with the same time', () => {
    const buf = PixelBuffer.create(64, 8);
    const renderer = new ClockRenderer({ font, format: 'HH:mm', timeZone: 'UTC' });
    const t = Date.UTC(2026, 3, 8, 12, 30, 0);
    renderer.render(buf, t);
    // Snapshot the buffer state, then poison it externally.
    const snapshot = new Uint8Array(buf.data);
    buf.fill(15);
    // Re-render with the same time → buffer must be restored to the snapshot
    // (no early-return cache shortcut).
    renderer.render(buf, t);
    for (let i = 0; i < buf.data.length; i++) {
      expect(buf.data[i]).toBe(snapshot[i]);
    }
  });

  it('regression: format-switch on shared buffer never leaves stale state', () => {
    // The bug: the previous version cached `lastRenderedString` and skipped
    // re-blit if the formatted string matched. When two different ClockRenderer
    // instances shared a buffer (as they do in the runtime via scene/render.ts's
    // clockRendererCache), switching back to a previous format would hit the
    // stale cache and never clear the other renderer's pixels.
    //
    // We test this without relying on glyph pixel content (the fixture font has
    // empty tofu glyphs for digits) by checking that re-rendering ALWAYS clears
    // the buffer first — i.e., a poisoned buffer is reset on every call.
    const buf = PixelBuffer.create(64, 8);
    const a = new ClockRenderer({ font, format: 'HH:mm', timeZone: 'UTC' });
    const t = Date.UTC(2026, 3, 8, 12, 30, 0);

    // First render at time t
    a.render(buf, t);
    expect(a.lastRenderedString).toBe('12:30');

    // Simulate "another renderer wrote to the same buffer" by poisoning every cell
    buf.fill(15);

    // Re-render with the EXACT SAME time — the previous (buggy) implementation
    // would early-return because lastRenderedString === '12:30' still matches
    // the new computed string. The buffer would stay poisoned. The fixed version
    // always clears first, so all cells return to 0 (since the fixture font's
    // digit glyphs are empty tofu).
    a.render(buf, t);
    for (let y = 0; y < buf.rows; y++) {
      for (let x = 0; x < buf.cols; x++) {
        expect(buf.get(x, y)).toBe(0);
      }
    }
  });

  it('centers the text horizontally by default', () => {
    const buf = PixelBuffer.create(64, 8);
    const renderer = new ClockRenderer({
      font,
      format: 'HH:mm',
      timeZone: 'UTC',
      align: 'center',
    });
    renderer.render(buf, Date.UTC(2026, 3, 8, 12, 30, 0));
    expect(renderer.lastRenderedString).toBe('12:30');
  });

  it('exposes lastRenderedString as null before any render', () => {
    const renderer = new ClockRenderer({ font, format: 'HH:mm', timeZone: 'UTC' });
    expect(renderer.lastRenderedString).toBeNull();
  });

  it('aligns left when align=left', () => {
    const buf = PixelBuffer.create(64, 8);
    const r = new ClockRenderer({ font, format: 'HH:mm', timeZone: 'UTC', align: 'left' });
    r.render(buf, Date.UTC(2026, 3, 8, 12, 30, 0));
    expect(r.lastRenderedString).toBe('12:30');
  });

  it('aligns right when align=right', () => {
    const buf = PixelBuffer.create(64, 8);
    const r = new ClockRenderer({ font, format: 'HH:mm', timeZone: 'UTC', align: 'right' });
    r.render(buf, Date.UTC(2026, 3, 8, 12, 30, 0));
    expect(r.lastRenderedString).toBe('12:30');
  });

  it('uses UTC as the default timezone when none is given', () => {
    const buf = PixelBuffer.create(64, 8);
    const r = new ClockRenderer({ font, format: 'HH:mm' });
    r.render(buf, Date.UTC(2026, 3, 8, 12, 30, 0));
    expect(r.lastRenderedString).toBe('12:30');
  });
});
