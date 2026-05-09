import { describe, expect, it } from 'vitest';
import { formatTime } from '../src/util/time.js';

describe('formatTime', () => {
  it('formats sub-10s with leading zero', () => {
    expect(formatTime(4700)).toBe('0:04.7');
    expect(formatTime(0)).toBe('0:00.0');
    expect(formatTime(1500)).toBe('0:01.5');
  });
  it('formats 10s+ without leading zero', () => {
    expect(formatTime(23000)).toBe('0:23.0');
    expect(formatTime(45670)).toBe('0:45.7');
  });
  it('crosses minute boundaries', () => {
    expect(formatTime(60000)).toBe('1:00.0');
    expect(formatTime(83400)).toBe('1:23.4');
    expect(formatTime(125900)).toBe('2:05.9');
  });
  it('clamps negative input', () => {
    expect(formatTime(-100)).toBe('0:00.0');
  });
});
