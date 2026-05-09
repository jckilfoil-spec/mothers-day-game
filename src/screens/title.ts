import type { Screen } from '../router.js';
import { el, mount } from '../util/dom.js';
import { paintMountainScene } from '../game/render.js';
import { sfx, startAmbient, unlock } from '../audio/sounds.js';

/**
 * Title screen — soft mountain sunrise behind a single huge "Start" CTA.
 */
export const titleScreen: Screen = (root, nav) => {
  const bgCanvas = el('canvas', {});
  const bg = el('div', { class: 'title__bg' }, [bgCanvas]);

  const startBtn = el('button', {
    class: 'btn btn--big bounce-in',
    onclick: () => {
      unlock();
      sfx.click();
      nav({ name: 'characters' });
    },
  }, ['Start']);

  const content = el('div', { class: 'title__content' }, [
    el('p', { class: 'title__heart bounce-in' }, ['for you, with love']),
    el('h1', { class: 'title__main bounce-in' }, ['A Game for Mom']),
    el('p', { class: 'title__sub bounce-in' }, ['A tiny adventure where you become the hero.']),
    startBtn,
  ]);

  const wrap = el('div', { class: 'title' }, [bg, content]);
  mount(root, wrap);

  // Paint background, animate gentle parallax
  const ctx = bgCanvas.getContext('2d');
  if (!ctx) return;
  let raf = 0;
  const start = performance.now();
  let running = true;

  const resize = (): void => {
    const dpr = window.devicePixelRatio || 1;
    bgCanvas.width = bg.clientWidth * dpr;
    bgCanvas.height = bg.clientHeight * dpr;
    bgCanvas.style.width = bg.clientWidth + 'px';
    bgCanvas.style.height = bg.clientHeight + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  resize();
  window.addEventListener('resize', resize);

  const tick = (): void => {
    if (!running) return;
    const t = performance.now() - start;
    paintMountainScene(ctx, {
      width: bg.clientWidth,
      height: bg.clientHeight,
      scrollX: t * 0.02,
      seed: 7,
    });
    raf = requestAnimationFrame(tick);
  };
  tick();

  // Start a soft menu ambient — but only after first interaction will we hear it
  const onFirst = (): void => {
    unlock();
    startAmbient('menu');
    window.removeEventListener('pointerdown', onFirst);
    window.removeEventListener('keydown', onFirst);
  };
  window.addEventListener('pointerdown', onFirst);
  window.addEventListener('keydown', onFirst);

  return () => {
    running = false;
    cancelAnimationFrame(raf);
    window.removeEventListener('resize', resize);
    window.removeEventListener('pointerdown', onFirst);
    window.removeEventListener('keydown', onFirst);
  };
};
