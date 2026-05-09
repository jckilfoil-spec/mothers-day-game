import type { Screen } from '../router.js';
import { el, mount } from '../util/dom.js';
import {
  paintMountainScene,
  paintCaveScene,
  paintBeachScene,
  paintCarScene,
} from '../game/render.js';
import { getSelectedCharacter, setLastMap, type MapId } from '../state.js';
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

  const tiles: HTMLElement[] = [
    mapTile('mountain', 'Hike the Mountain!', 'Climb to the flag at the top.', () => go('mountain')),
    mapTile('cave', 'Go Spelunking!', 'Dig down to the glowing crystal below.', () => go('cave')),
    mapTile('beach', 'Hunt for Sharkteeth!', 'Avoid hot sand. Find the shark tooth at the end.', () => go('beach')),
    mapTile('car', 'Drive Home', 'Dodge phones and cars. Get home to family.', () => go('car')),
  ];

  function go(m: MapId): void {
    setLastMap(m);
    sfx.click();
    nav({ name: 'game', map: m });
  }

  const wrap = el('div', { class: 'screen' }, [
    el('div', { class: 'screen__header screen__header--sticky' }, [
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
    el('div', { class: 'map-select' }, tiles),
    el('p', { class: 'muted text-center', style: 'margin-top:var(--s-6)' }, [
      'Four short levels. Each one is a complete little gift on its own.',
    ]),
  ]);

  mount(root, wrap);

  // Paint each preview
  for (const tile of tiles) {
    const variant = tile.dataset.map as MapId;
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
      switch (variant) {
        case 'mountain':
          paintMountainScene(ctx, { width: w, height: h, seed: 5 });
          break;
        case 'cave':
          paintCaveScene(ctx, { width: w, height: h, seed: 21 });
          break;
        case 'beach':
          paintBeachScene(ctx, { width: w, height: h, seed: 42 });
          break;
        case 'car':
          paintCarScene(ctx, { width: w, height: h, seed: 17 });
          break;
      }
    });
  }
};

function mapTile(map: MapId, title: string, sub: string, onClick: () => void): HTMLElement {
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
