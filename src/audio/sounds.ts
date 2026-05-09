/**
 * Procedural sound effects via Web Audio API.
 *
 * No audio assets are bundled; each SFX is a short oscillator/envelope routine.
 * AudioContext is created lazily on the first user gesture (browsers require this),
 * which means SFX may be silent on the very first interaction — that's intentional
 * and preferable to a noisy autoplay warning.
 */

import { getSettings } from '../state.js';

let ctx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let ambientNodes: { osc: OscillatorNode; gain: GainNode }[] = [];

function ensureCtx(): AudioContext | null {
  if (ctx) return ctx;
  if (typeof window === 'undefined') return null;
  const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  try {
    ctx = new Ctor();
    masterGain = ctx.createGain();
    masterGain.gain.value = getSettings().muted ? 0 : 0.55;
    masterGain.connect(ctx.destination);
    return ctx;
  } catch {
    return null;
  }
}

/** Call this from a click/tap handler to satisfy autoplay policies. */
export function unlock(): void {
  const c = ensureCtx();
  if (c && c.state === 'suspended') void c.resume();
}

export function setMuted(muted: boolean): void {
  if (!masterGain) return;
  masterGain.gain.value = muted ? 0 : 0.55;
}

interface ToneOpts {
  freq: number;
  type?: OscillatorType;
  attack?: number;
  decay?: number;
  duration?: number;
  gain?: number;
  freqEnd?: number;
}

function tone(opts: ToneOpts): void {
  const c = ensureCtx();
  if (!c || !masterGain) return;
  const now = c.currentTime;
  const dur = opts.duration ?? 0.18;
  const attack = opts.attack ?? 0.01;
  const decay = opts.decay ?? 0.16;
  const peak = (opts.gain ?? 0.4);
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = opts.type ?? 'sine';
  osc.frequency.setValueAtTime(opts.freq, now);
  if (opts.freqEnd !== undefined) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, opts.freqEnd), now + dur);
  }
  g.gain.setValueAtTime(0, now);
  g.gain.linearRampToValueAtTime(peak, now + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, now + attack + decay);
  osc.connect(g).connect(masterGain);
  osc.start(now);
  osc.stop(now + dur + 0.05);
}

export const sfx = {
  jump(): void {
    tone({ freq: 380, freqEnd: 720, type: 'sine', duration: 0.2, attack: 0.005, decay: 0.18, gain: 0.28 });
  },
  hit(): void {
    tone({ freq: 220, freqEnd: 90, type: 'square', duration: 0.12, attack: 0.001, decay: 0.1, gain: 0.18 });
  },
  defeat(): void {
    tone({ freq: 540, freqEnd: 180, type: 'triangle', duration: 0.32, attack: 0.005, decay: 0.3, gain: 0.32 });
    setTimeout(() => tone({ freq: 220, freqEnd: 110, type: 'sine', duration: 0.2, gain: 0.2 }), 60);
  },
  click(): void {
    tone({ freq: 880, freqEnd: 990, type: 'sine', duration: 0.06, attack: 0.001, decay: 0.05, gain: 0.12 });
  },
  win(): void {
    // Three rising chord notes
    const c = ensureCtx();
    if (!c) return;
    const notes = [392, 494, 587, 784]; // G4, B4, D5, G5
    notes.forEach((f, i) => {
      setTimeout(
        () => tone({ freq: f, type: 'triangle', duration: 0.6, attack: 0.02, decay: 0.55, gain: 0.22 }),
        i * 110,
      );
    });
  },
  step(): void {
    tone({ freq: 180, type: 'sine', duration: 0.05, attack: 0.001, decay: 0.04, gain: 0.05 });
  },
  ouch(): void {
    tone({ freq: 700, freqEnd: 220, type: 'square', duration: 0.18, attack: 0.005, decay: 0.16, gain: 0.18 });
  },
  honk(): void {
    tone({ freq: 240, freqEnd: 200, type: 'sawtooth', duration: 0.16, attack: 0.005, decay: 0.14, gain: 0.16 });
  },
};

/**
 * Soft ambient pad. Two detuned sines drifting slowly. Replaceable per map.
 */
export function startAmbient(map: 'mountain' | 'cave' | 'menu'): void {
  stopAmbient();
  const c = ensureCtx();
  if (!c || !masterGain) return;

  const config: Record<typeof map, { freqs: number[]; gain: number; type: OscillatorType }> = {
    menu: { freqs: [220, 277], gain: 0.04, type: 'sine' },
    mountain: { freqs: [261.6, 329.6, 392], gain: 0.045, type: 'sine' },
    cave: { freqs: [98, 130.8, 196], gain: 0.05, type: 'triangle' },
  };
  const cfg = config[map];

  const ambGain = c.createGain();
  ambGain.gain.value = 0;
  ambGain.gain.linearRampToValueAtTime(cfg.gain, c.currentTime + 1.2);
  ambGain.connect(masterGain);

  for (const f of cfg.freqs) {
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = cfg.type;
    osc.frequency.value = f;
    // Tiny LFO for shimmer
    const lfo = c.createOscillator();
    const lfoGain = c.createGain();
    lfo.frequency.value = 0.18 + Math.random() * 0.2;
    lfoGain.gain.value = 1.5;
    lfo.connect(lfoGain).connect(osc.frequency);
    g.gain.value = 1 / cfg.freqs.length;
    osc.connect(g).connect(ambGain);
    osc.start();
    lfo.start();
    ambientNodes.push({ osc, gain: g });
    ambientNodes.push({ osc: lfo, gain: lfoGain });
  }
}

export function stopAmbient(): void {
  const c = ensureCtx();
  if (!c) return;
  const now = c.currentTime;
  for (const n of ambientNodes) {
    try {
      n.gain.gain.cancelScheduledValues(now);
      n.gain.gain.setValueAtTime(n.gain.gain.value, now);
      n.gain.gain.linearRampToValueAtTime(0, now + 0.4);
      n.osc.stop(now + 0.45);
    } catch {
      /* node may already be stopped */
    }
  }
  ambientNodes = [];
}
