/**
 * Difficulty selector modal — opened from the Open World tile on map-select.
 *
 * Locked scope (per design call 2026-05-09): prototype-only. The 4 solid maps
 * never see this; their behavior is unchanged. Death mode is forced on for the
 * prototype regardless of `settings.deathMode` — the difficulty just dials the
 * HP, enemy density, and (on Hard) a kill-50-to-unlock-goal gate.
 */

import { el } from '../util/dom.js';
import { sfx } from '../audio/sounds.js';
import {
  getSettings,
  setPrototypeDifficulty,
  type Difficulty,
} from '../state.js';

interface DifficultyModalOpts {
  onPick(difficulty: Difficulty): void;
}

interface DifficultyOption {
  id: Difficulty;
  title: string;
  hp: string;
  flavor: string;
  hint: string;
}

const OPTIONS: DifficultyOption[] = [
  {
    id: 'easy',
    title: 'Easy',
    hp: '20 HP',
    flavor: 'Stroll the cloud layers. Goal opens whenever you arrive.',
    hint: 'For casual exploration — most hazards are just bouncy.',
  },
  {
    id: 'medium',
    title: 'Medium',
    hp: '10 HP',
    flavor: 'More gulls. More heat. Goal opens whenever you arrive.',
    hint: 'Enemy density 2× — bring your reflexes.',
  },
  {
    id: 'hard',
    title: 'Hard',
    hp: '5 HP',
    flavor: 'Goal locked until you defeat 50 enemies. Bring it.',
    hint: 'Enemy density 3× + locked goal. The full open-world challenge.',
  },
];

export function openDifficultyModal(opts: DifficultyModalOpts): void {
  const backdrop = el('div', { class: 'modal-backdrop' });

  function close(): void {
    backdrop.remove();
  }

  const last = getSettings().prototypeDifficulty;

  const cards = OPTIONS.map((opt) =>
    el('button', {
      type: 'button',
      class: 'difficulty-card' + (opt.id === last ? ' is-last-pick' : ''),
      onclick: () => {
        sfx.click();
        setPrototypeDifficulty(opt.id);
        close();
        opts.onPick(opt.id);
      },
    }, [
      el('div', { class: 'difficulty-card__head' }, [
        el('span', { class: 'difficulty-card__title' }, [opt.title]),
        el('span', { class: 'difficulty-card__hp' }, [opt.hp]),
      ]),
      el('p', { class: 'difficulty-card__flavor' }, [opt.flavor]),
      el('p', { class: 'difficulty-card__hint' }, [opt.hint]),
    ]),
  );

  const sheet = el('div', { class: 'difficulty-modal' }, [
    el('div', { class: 'difficulty-modal__head' }, [
      el('h2', {}, ['Pick your challenge']),
      el('button', {
        type: 'button',
        class: 'settings-panel__close',
        'aria-label': 'Close',
        onclick: () => {
          sfx.click();
          close();
        },
      }, ['×']),
    ]),
    el('p', { class: 'difficulty-modal__sub' }, [
      'Death mode is on in the open world. Pick the dial.',
    ]),
    el('div', { class: 'difficulty-cards' }, cards),
  ]);

  backdrop.appendChild(sheet);
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) close();
  });

  document.body.appendChild(backdrop);
  // Focus the previously-picked card so Enter re-confirms it.
  (sheet.querySelector('.is-last-pick, .difficulty-card') as HTMLElement | null)?.focus();
}
