import type { Screen } from '../router.js';
import { el, mount } from '../util/dom.js';
import {
  paintMountainScene,
  paintCaveScene,
  paintBeachScene,
  paintCarScene,
  paintSkyBeachScene,
} from '../game/render.js';
import { getSelectedCharacter, setLastMap, type MapId } from '../state.js';
import { sfx } from '../audio/sounds.js';
import { track, bumpAttempt } from '../analytics.js';
import { openDifficultyModal } from './difficultyModal.js';

/** Map Select screen — two big tiles. */
export const mapSelectScreen: Screen = (root, nav) => {
  const character = getSelectedCharacter();
  if (!character) {
    nav({ name: 'characters' });
    return;
  }

  // .mapselect-meta is the flex wrapper; .hero-chip shrinks (so the name
  // ellipsizes) while .change-link stays at flex: 0 0 auto and never clips.
  const chip = el('div', { class: 'mapselect-meta' }, [
    el('div', { class: 'hero-chip character-chip' }, [
      character.faceImage
        ? el('img', { class: 'face', src: character.faceImage, alt: character.name })
        : el('div', { class: 'face character-chip__placeholder' }, ['🙂']),
      el('span', { class: 'name' }, [character.name]),
    ]),
    el('button', {
      class: 'change-link',
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

  // Open-world prototype tile — opens difficulty modal first; nav happens after pick.
  const prototypeTiles: HTMLElement[] = [
    mapTile(
      'sky-beach',
      'Open Beach (Beta)',
      'Climb 5 cloud layers above the surf. Death mode on, pick your difficulty.',
      () => {
        sfx.click();
        openDifficultyModal({
          onPick: (difficulty) => {
            track('difficulty_picked', { difficulty, level_id: 'sky-beach' });
            go('sky-beach');
          },
        });
      },
      /* badge */ 'Beta',
    ),
  ];

  function go(m: MapId): void {
    setLastMap(m);
    sfx.click();
    const attempt = bumpAttempt(m);
    track('level_started', {
      level_id: m,
      level_name: m,
      attempt_number: attempt,
    });
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
      el('h1', {}, ['Meet me at our special place.']),
      el('div', { style: 'margin-left:auto' }, [chip]),
    ]),
    el('p', { class: 'muted text-center mapselect-sub' }, [
      'I can only tell you there. Pick the one you want.',
    ]),
    el('div', { class: 'map-select' }, tiles),
    el('div', { class: 'mapselect-section' }, [
      el('span', { class: 'mapselect-section__title' }, ['✨ Open World']),
      el('span', { class: 'mapselect-section__sub' }, ['experimental — bigger maps, pick your difficulty']),
    ]),
    el('div', { class: 'map-select map-select--prototype' }, prototypeTiles),
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
        case 'sky-beach':
          paintSkyBeachScene(ctx, { width: w, height: h, seed: 64 });
          break;
      }
    });
  }
};

function mapTile(map: MapId, title: string, sub: string, onClick: () => void, badge?: string): HTMLElement {
  return el('button', {
    class: 'map-tile' + (badge ? ' map-tile--badged' : ''),
    'data-map': map,
    onclick: onClick,
  }, [
    el('div', { class: 'map-tile__art' }, [
      el('canvas', {}),
      badge ? el('span', { class: 'map-tile__badge' }, [badge]) : null,
    ]),
    el('div', { class: 'map-tile__body' }, [
      el('h3', { class: 'map-tile__title' }, [title]),
      el('p', { class: 'map-tile__sub' }, [sub]),
    ]),
  ]);
}
