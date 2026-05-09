import type { Screen } from '../router.js';
import { el, mount } from '../util/dom.js';
import { Game } from '../game/game.js';
import { makeCaveLevel, makeMountainLevel } from '../game/levels.js';
import { getSelectedCharacter, getSettings, setMuted } from '../state.js';
import { setMuted as audioSetMuted, sfx, unlock } from '../audio/sounds.js';

/** Game screen — fullscreen canvas with HUD overlay. */
export const gameScreen: Screen = (root, nav, route) => {
  if (route.name !== 'game') {
    nav({ name: 'mapSelect' });
    return;
  }
  const mapId = route.map;

  const character = getSelectedCharacter();
  if (!character) {
    nav({ name: 'characters' });
    return;
  }

  unlock();
  const level = mapId === 'mountain' ? makeMountainLevel() : makeCaveLevel();

  const canvas = el('canvas', {}) as HTMLCanvasElement;
  const stage = el('div', { class: 'game-stage' }, [canvas]);

  const muteBtn = el('button', {
    class: 'icon-pill',
    title: 'Mute',
  }, [getSettings().muted ? '🔇' : '🔊']);

  const charChip = el('div', { class: 'game-hud__char' }, [
    character.faceImage
      ? el('img', { src: character.faceImage, alt: character.name })
      : el('div', { class: 'placeholder' }, ['🙂']),
    el('span', {}, [character.name]),
  ]);

  const hud = el('div', { class: 'game-hud' }, [
    charChip,
    el('div', { class: 'game-hud__buttons' }, [
      muteBtn,
      el('button', {
        class: 'icon-pill',
        title: 'Pause / menu',
        onclick: () => {
          sfx.click();
          game.destroy();
          nav({ name: 'mapSelect' });
        },
      }, ['⏸']),
    ]),
  ]);

  const banner = el('div', { class: 'controls-banner' }, [
    'Arrows or A/D to move · Space to jump · Click monsters to defeat',
  ]);

  const touchControls = el('div', { class: 'touch-controls' }, [
    el('div', { class: 'touch-cluster' }, [
      el('button', { class: 'touch-btn', id: 'btn-left' }, ['◀']),
      el('button', { class: 'touch-btn', id: 'btn-right' }, ['▶']),
    ]),
    el('div', { class: 'touch-cluster' }, [
      el('button', { class: 'touch-btn', id: 'btn-jump' }, ['⤒']),
    ]),
  ]);

  const wrap = el('div', { class: 'game-wrap' }, [stage, hud, banner, touchControls]);
  mount(root, wrap);

  const game = new Game(
    canvas,
    {
      level,
      faceImage: character.faceImage,
      characterName: character.name,
    },
    {
      onWin: () => {
        nav({ name: 'win', map: mapId });
      },
    },
  );

  // Bind touch buttons
  game.bindTouchButton(touchControls.querySelector('#btn-left') as HTMLElement, 'left');
  game.bindTouchButton(touchControls.querySelector('#btn-right') as HTMLElement, 'right');
  game.bindTouchButton(touchControls.querySelector('#btn-jump') as HTMLElement, 'jump');

  // Mute toggle
  muteBtn.addEventListener('click', () => {
    const next = !getSettings().muted;
    setMuted(next);
    audioSetMuted(next);
    muteBtn.textContent = next ? '🔇' : '🔊';
  });

  // Fade banner after 4s
  setTimeout(() => banner.classList.add('is-fading'), 4000);
  setTimeout(() => banner.remove(), 5200);

  game.start();

  return () => {
    game.destroy();
  };
};
