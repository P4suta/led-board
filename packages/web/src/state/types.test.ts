import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, type EditableScene, parseSettings, toRuntimeScene } from './types';

describe('state/types', () => {
  describe('toRuntimeScene', () => {
    it('converts a scroll scene', () => {
      const s: EditableScene = {
        id: 'a',
        kind: 'scroll',
        text: 'hello',
        speedPxPerSec: 60,
        clockFormat: 'HH:mm',
        color: 'red',
      };
      const out = toRuntimeScene(s);
      expect(out.kind).toBe('scroll');
      if (out.kind === 'scroll') {
        expect(out.text).toBe('hello');
        expect(out.speedPxPerSec).toBe(60);
      }
    });

    it('substitutes a single space for empty scroll text to avoid blank scene crash', () => {
      const out = toRuntimeScene({
        id: 'a',
        kind: 'scroll',
        text: '',
        speedPxPerSec: 60,
        clockFormat: 'HH:mm',
        color: 'red',
      });
      if (out.kind === 'scroll') expect(out.text).toBe(' ');
      else throw new Error('expected scroll');
    });

    it('converts a static scene with multi-line text', () => {
      const out = toRuntimeScene({
        id: 'a',
        kind: 'static',
        text: 'line1\nline2',
        speedPxPerSec: 0,
        clockFormat: 'HH:mm',
        color: 'red',
      });
      expect(out.kind).toBe('static');
      if (out.kind === 'static') expect(out.lines).toEqual(['line1', 'line2']);
    });

    it('substitutes a single space line for empty static text', () => {
      const out = toRuntimeScene({
        id: 'a',
        kind: 'static',
        text: '',
        speedPxPerSec: 0,
        clockFormat: 'HH:mm',
        color: 'red',
      });
      if (out.kind === 'static') expect(out.lines).toEqual([' ']);
      else throw new Error('expected static');
    });

    it('converts a clock scene', () => {
      const out = toRuntimeScene({
        id: 'a',
        kind: 'clock',
        text: '',
        speedPxPerSec: 0,
        clockFormat: 'HH:mm:ss',
        color: 'green',
      });
      expect(out.kind).toBe('clock');
      if (out.kind === 'clock') expect(out.format).toBe('HH:mm:ss');
    });
  });

  describe('parseSettings', () => {
    it('returns DEFAULT_SETTINGS for null', () => {
      expect(parseSettings(null)).toEqual(DEFAULT_SETTINGS);
    });

    it('returns DEFAULT_SETTINGS for non-objects', () => {
      expect(parseSettings('foo')).toEqual(DEFAULT_SETTINGS);
      expect(parseSettings(123)).toEqual(DEFAULT_SETTINGS);
    });

    it('returns DEFAULT_SETTINGS for objects with the wrong version', () => {
      expect(parseSettings({ version: 99 })).toEqual(DEFAULT_SETTINGS);
    });

    it('returns the input when version === 1', () => {
      const s = { ...DEFAULT_SETTINGS, board: { ...DEFAULT_SETTINGS.board, cols: 256 } };
      expect(parseSettings(s)).toEqual(s);
    });
  });
});
