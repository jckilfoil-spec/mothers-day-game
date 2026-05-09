import type { Screen } from '../router.js';
import { el, mount, clear } from '../util/dom.js';
import { Game } from '../game/game.js';
import {
  makeBeachLevel,
  makeCarLevel,
  makeCaveLevel,
  makeMountainLevel,
} from '../game/levels.js';
import { getSelectedCharacter } from '../state.js';
import { sfx, unlock } from '../audio/sounds.js';
import { openSettings } from './settings.js';

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
  const level =
    mapId === 'mountain' ? makeMountainLevel()
    : mapId === 'cave' ? makeCaveLevel()
    : mapId === 'beach' ? makeBeachLevel()
    : makeCarLevel();

  const canvas = el('canvas', {}) as HTMLCanvasElement;
  const stage = el('div', { class: 'game-stage' }, [canvas]);

  const charChip = el('button', {
    class: 'game-hud__char',
    title: 'Pick a different hero',
    'aria-label': 'Pick a different hero',
    onclick: () => {
      sfx.click();
      game.destroy();
      nav({ name: 'characters' });
    },
  });
  // Build chip contents from the currently-selected character; can be re-called when
  // the user switches characters mid-run via the settings panel.
  const renderChip = (): void => {
    const c = getSelectedCharacter();
    if (!c) return;
    clear(charChip);
    charChip.appendChild(
      c.faceImage
        ? el('img', { src: c.faceImage, alt: c.name })
        : el('div', { class: 'placeholder' }, ['🙂']),
    );
    charChip.appendChild(el('span', {}, [c.name]));
  };
  renderChip();

  // Single gear button → opens the settings overlay (zoom, sound, death mode, quit).
  const gearBtn = el('button', {
    class: 'icon-pill',
    title: 'Settings',
    'aria-label': 'Settings',
    onclick: () => {
      sfx.click();
      game.pause();
      openSettings({
        onSettingsChange: () => game.refresh(),
        onSwitchCharacter: () => {
          // Mid-run swap: face + lives update, position/timer preserved.
          game.refreshCharacter();
          renderChip();
        },
        onCreateNewCharacter: () => {
          // Drop the current run and head to the editor.
          game.destroy();
          nav({ name: 'editor', characterId: null });
        },
        onQuit: () => {
          game.destroy();
          nav({ name: 'mapSelect' });
        },
        onClose: () => game.resume(),
      });
    },
  }, ['⚙']);

  const hud = el('div', { class: 'game-hud' }, [
    charChip,
    el('div', { class: 'game-hud__buttons' }, [gearBtn]),
  ]);

  const bannerCloseBtn = el('button', {
    class: 'controls-banner__close',
    title: 'Got it',
    'aria-label': 'Dismiss controls hint',
  }, ['×']);
  const banner = el('div', { class: 'controls-banner' }, [
    el('span', { class: 'controls-banner__row' }, [
      el('kbd', {}, ['◀']), el('kbd', {}, ['▶']), ' move  ',
      el('kbd', {}, ['Space']), ' or ', el('kbd', {}, ['↑']), ' jump (jump up through platforms)  ',
      el('kbd', {}, ['↓']), ' drop through  ',
      el('span', { class: 'muted' }, ['· click silly monsters to defeat them']),
    ]),
    bannerCloseBtn,
  ]);
  bannerCloseBtn.addEventListener('click', () => {
    sfx.click();
    banner.classList.add('is-fading');
    setTimeout(() => banner.remove(), 250);
  });

  const touchControls = el('div', { class: 'touch-controls' }, [
    el('div', { class: 'touch-cluster' }, [
      el('button', { class: 'touch-btn', id: 'btn-left' }, ['◀']),
      el('button', { class: 'touch-btn', id: 'btn-right' }, ['▶']),
    ]),
    el('div', { class: 'touch-cluster' }, [
      el('button', { class: 'touch-btn', id: 'btn-down' }, ['▼']),
      el('button', { class: 'touch-btn', id: 'btn-jump' }, ['▲']),
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
      characterId: character.id,
    },
    {
      onWin: (elapsedMs) => {
        nav({ name: 'win', map: mapId, elapsedMs });
      },
      onCharacterLost: () => {
        // Death-mode: lost all 3 lives. The character has already been deleted
        // from state by Game; just ferry the user back to the picker.
        game.destroy();
        nav({ name: 'characters' });
      },
    },
  );

  // Bind touch buttons
  game.bindTouchButton(touchControls.querySelector('#btn-left') as HTMLElement, 'left');
  game.bindTouchButton(touchControls.querySelector('#btn-right') as HTMLElement, 'right');
  game.bindTouchButton(touchControls.querySelector('#btn-jump') as HTMLElement, 'jump');
  game.bindTouchButton(touchControls.querySelector('#btn-down') as HTMLElement, 'down');

  // (Mute / pause moved into the settings panel — opened by the gear icon.)

  // Banner persists until the user explicitly dismisses it via the X button.

  game.start();

  return () => {
    game.destroy();
  };
};
