import type { Screen } from '../router.js';
import { el, mount, clear } from '../util/dom.js';
import {
  getCharacters,
  selectCharacter,
  getSettings,
  deleteCharacter,
  type Character,
} from '../state.js';
import { sfx } from '../audio/sounds.js';
import { track } from '../analytics.js';

/** Character manager — grid of cards with add / edit / delete / select. */
export const characterManagerScreen: Screen = (root, nav) => {
  const grid = el('div', { class: 'char-grid' });
  // Sticky top-right Play action — always visible without scrolling.
  const playBtn = el('button', {
    class: 'btn btn--big screen__primary',
    onclick: () => {
      sfx.click();
      nav({ name: 'mapSelect' });
    },
  }, ['Play →']);
  playBtn.style.display = 'none';
  const wrap = el('div', { class: 'screen' }, [
    el('div', { class: 'screen__header screen__header--sticky' }, [
      el('button', {
        class: 'screen__back',
        title: 'Back to title',
        onclick: () => {
          sfx.click();
          nav({ name: 'title' });
        },
      }, ['‹']),
      el('h1', {}, ['Are you mom?']),
      playBtn,
    ]),
    grid,
    el('p', { class: 'muted text-center', style: 'margin-top:var(--s-6)' }, [
      'Who are you?',
    ]),
  ]);

  const render = (): void => {
    clear(grid);
    const chars = getCharacters();
    const selectedId = getSettings().selectedCharacterId;

    for (const c of chars) {
      grid.appendChild(characterCard(c, c.id === selectedId, nav, render));
    }

    // Always-present Add tile
    const addTile = el('button', {
      class: 'char-card char-card--add',
      onclick: () => {
        sfx.click();
        nav({ name: 'editor', characterId: null });
      },
      'aria-label': 'Add a new character',
    }, [
      el('span', { class: 'add-plus' }, ['+']),
      el('p', { class: 'char-card__name' }, ['Add character']),
    ]);
    grid.appendChild(addTile);

    if (chars.length === 0) {
      const empty = el('div', { class: 'char-empty' }, [
        el('div', { class: 'char-empty__art' }, ['🌸']),
        el('h2', { class: 'char-empty__title' }, ["Let's make a character!"]),
        el('p', { class: 'char-empty__sub' }, [
          'Upload a photo of mom (or anyone you love) and they become the hero of the game.',
        ]),
        el('button', {
          class: 'btn btn--big',
          onclick: () => {
            sfx.click();
            nav({ name: 'editor', characterId: null });
          },
        }, ['Make one']),
      ]);
      // Replace grid with the empty state for first run
      clear(grid);
      grid.appendChild(empty);
      playBtn.style.display = 'none';
      return;
    }

    // Show / hide and update the sticky Play button based on selection.
    const selected = chars.find((c) => c.id === selectedId);
    if (selected) {
      playBtn.style.display = '';
      playBtn.textContent = `Play with ${selected.name} →`;
    } else {
      playBtn.style.display = 'none';
    }
  };

  render();
  mount(root, wrap);
};

function characterCard(
  c: Character,
  selected: boolean,
  nav: import('../router.js').Nav,
  rerender: () => void,
): HTMLElement {
  const face = c.faceImage
    ? el('img', { class: 'char-card__face', src: c.faceImage, alt: c.name })
    : el('div', { class: 'char-card__face char-card__face--placeholder' }, ['🙂']);

  const card = el('div', {
    class: 'char-card' + (selected ? ' is-selected' : ''),
    onclick: (e: Event) => {
      const target = e.target as HTMLElement;
      if (target.closest('.char-card__icon-btn')) return;
      sfx.click();
      selectCharacter(c.id);
      rerender();
    },
  }, [
    selected ? el('span', { class: 'char-card__badge' }, ['✓ Playing']) : null,
    face,
    el('p', { class: 'char-card__name' }, [c.name]),
    el('div', { class: 'char-card__actions' }, [
      el('button', {
        class: 'char-card__icon-btn',
        title: 'Edit',
        onclick: (e: Event) => {
          e.stopPropagation();
          sfx.click();
          nav({ name: 'editor', characterId: c.id });
        },
      }, ['✎']),
      el('button', {
        class: 'char-card__icon-btn char-card__icon-btn--danger',
        title: 'Delete',
        onclick: (e: Event) => {
          e.stopPropagation();
          confirmDelete(c, () => {
            deleteCharacter(c.id);
            track('character_deleted', { character_id: c.id });
            rerender();
          });
        },
      }, ['🗑']),
    ]),
  ]);

  return card;
}

function confirmDelete(c: Character, onYes: () => void): void {
  const backdrop = el('div', { class: 'modal-backdrop' });
  const modal = el('div', { class: 'modal' }, [
    el('h2', {}, ['Are you sure?']),
    el('p', {}, [`This will remove ${c.name}.`]),
    el('div', { class: 'modal__row' }, [
      el('button', {
        class: 'btn btn--secondary',
        onclick: () => {
          sfx.click();
          backdrop.remove();
        },
      }, ['Keep']),
      el('button', {
        class: 'btn btn--danger',
        onclick: () => {
          sfx.click();
          onYes();
          backdrop.remove();
        },
      }, ['Remove']),
    ]),
  ]);
  backdrop.appendChild(modal);
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) backdrop.remove();
  });
  document.body.appendChild(backdrop);
}
