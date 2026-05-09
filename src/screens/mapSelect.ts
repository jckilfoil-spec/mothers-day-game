import type { Screen } from '../router.js';
import { el, mount } from '../util/dom.js';
import { paintMountainScene, paintCaveScene } from '../game/render.js';
import { getSelectedCharacter, setLastMap } from '../state.js';
import { sfx } from '../audio/sounds.js';

/** Map Select screen — two big tiles. */
export const mapSelectScreen: Screen = (root, nav) => {
  const character = getSelectedCharacter();
  if (!character) {
    nav({ name: 'characters' });
    return;
  }

  const chip = el('div', { class: 'character-chip' }, [
    character.faceImage
      ? el('img', { src: character.faceImage, alt: character.name })
      : el('div', { class: 'character-chip__placeholder' }, ['🙂']),
    el('span', {}, [character.name]),
    el('button', {
      onclick: () => {
        sfx.click();
        nav({ name: 'characters' });
      },
    }, ['Change']),
  ]);

  const tileMtn = mapTile('mountain', 'Mountain Ascent', 'Climb to the top!', () => {
    setLastMap('mountain');
    sfx.click();
    nav({ name: 'game', map: 'mountain' });
  });
  const tileCave = mapTile('cave', 'Cave Descent', 'Find the treasure!', () => {
    setLastMap('cave');
    sfx.click();
    nav({ name: 'game', map: 'cave' });
  });

  const wrap = el('div', { class: 'screen' }, [
    el('div', { class: 'screen__header' }, [
      el('button', {
        class: 'screen__back',
        title: 'Back',
        onclick: () => {
          sfx.click();
          nav({ name: 'characters' });
        },
      }, ['‹']),
      el('h1', {}, ['Pick an adventure']),
      el('div', { style: 'margin-left:auto' }, [chip]),
    ]),
    el('div', { class: 'map-select' }, [tileMtn, tileCave]),
    el('p', { class: 'muted text-center', style: 'margin-top:var(--s-6)' }, [
      'Two short levels. Either one works as a complete little gift.',
    ]),
  ]);

  mount(root, wrap);

  // Paint both previews
  for (const tile of [tileMtn, tileCave]) {
    const variant = tile.dataset.map as 'mountain' | 'cave';
    const canvas = tile.querySelector('canvas') as HTMLCanvasElement | null;
    if (!canvas) continue;
    requestAnimationFrame(() => {
      const dpr = window.devicePixelRatio || 1;
      const art = canvas.parentElement!;
      const w = art.clientWidth;
      const h = art.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      const ctx = canvas.getContext('2d')!;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (variant === 'mountain') {
        paintMountainScene(ctx, { width: w, height: h, seed: 5 });
      } else {
        paintCaveScene(ctx, { width: w, height: h, seed: 21 });
      }
    });
  }
};

function mapTile(map: 'mountain' | 'cave', title: string, sub: string, onClick: () => void): HTMLElement {
  return el('button', {
    class: 'map-tile',
    'data-map': map,
    onclick: onClick,
  }, [
    el('div', { class: 'map-tile__art' }, [el('canvas', {})]),
    el('div', { class: 'map-tile__body' }, [
      el('h3', { class: 'map-tile__title' }, [title]),
      el('p', { class: 'map-tile__sub' }, [sub]),
    ]),
  ]);
}
