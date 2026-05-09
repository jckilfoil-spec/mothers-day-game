/**
 * In-game settings overlay. Opens as a modal over the running (paused) game.
 *
 * Contents: zoom slider, sound on/off, death-mode on/off (with caveat), quit-to-menu.
 * The Game instance is paused while open and resumed on close.
 */

import { el, clear } from '../util/dom.js';
import {
  getSettings,
  setMuted,
  setZoom,
  setDeathMode,
  getSelectedCharacter,
  resetLives,
} from '../state.js';
import { sfx, setMuted as audioSetMuted } from '../audio/sounds.js';

export interface SettingsOpts {
  /** Called whenever the user changes a setting that the running game cares about
   *  (zoom). Game uses this to re-apply scale immediately. */
  onSettingsChange?: () => void;
  /** Called when the user picks "Quit to menu". */
  onQuit: () => void;
  /** Called whenever the modal closes (any reason). */
  onClose: () => void;
}

export function openSettings(opts: SettingsOpts): void {
  const backdrop = el('div', { class: 'modal-backdrop' });
  const panel = el('div', { class: 'settings-panel' });
  backdrop.appendChild(panel);

  const close = (): void => {
    backdrop.remove();
    opts.onClose();
  };

  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) close();
  });

  const render = (): void => {
    clear(panel);
    const s = getSettings();
    const character = getSelectedCharacter();

    // ---- Header ----
    panel.appendChild(
      el('div', { class: 'settings-panel__header' }, [
        el('h2', {}, ['Settings']),
        el('button', {
          class: 'settings-panel__close',
          title: 'Close',
          'aria-label': 'Close settings',
          onclick: () => {
            sfx.click();
            close();
          },
        }, ['×']),
      ]),
    );

    // ---- Zoom ----
    const zoomLabel = el('span', { class: 'settings-row__value' }, [`${s.zoom.toFixed(2)}x`]);
    panel.appendChild(
      el('div', { class: 'settings-row' }, [
        el('label', { for: 'zoom-slider' }, ['Camera zoom']),
        el('input', {
          id: 'zoom-slider',
          type: 'range',
          min: '0.7',
          max: '1.3',
          step: '0.05',
          value: String(s.zoom),
          oninput: (e: Event) => {
            const v = Number((e.target as HTMLInputElement).value);
            setZoom(v);
            zoomLabel.textContent = `${v.toFixed(2)}x`;
            opts.onSettingsChange?.();
          },
        }),
        zoomLabel,
      ]),
    );

    // ---- Sound ----
    panel.appendChild(
      el('div', { class: 'settings-row' }, [
        el('label', {}, ['Sound']),
        el('button', {
          class: 'toggle' + (s.muted ? '' : ' is-on'),
          onclick: () => {
            const next = !getSettings().muted;
            setMuted(next);
            audioSetMuted(next);
            sfx.click();
            render();
          },
        }, [s.muted ? 'Off' : 'On']),
      ]),
    );

    // ---- Death mode ----
    const deathRow = el('div', { class: 'settings-row settings-row--stacked' }, [
      el('div', { class: 'settings-row__line' }, [
        el('label', {}, ['Death mode']),
        el('button', {
          class: 'toggle' + (s.deathMode ? ' is-on toggle--danger' : ''),
          onclick: () => {
            const next = !getSettings().deathMode;
            setDeathMode(next);
            sfx.click();
            opts.onSettingsChange?.();
            render();
          },
        }, [s.deathMode ? 'On' : 'Off']),
      ]),
      el('p', { class: 'settings-row__hint' }, [
        s.deathMode
          ? `5 HP per life. Hazards hurt. ${character?.name ?? 'Your hero'} has ${
              character?.livesLeft ?? 3
            } ${(character?.livesLeft ?? 3) === 1 ? 'life' : 'lives'} left — losing them all deletes the character.`
          : 'When on, hazards damage you. 5 HP per life, 3 lives total. Lose them all and the character is gone.',
      ]),
    ]);

    // Optional reset-lives button if this character is depleted
    if (s.deathMode && character && (character.livesLeft ?? 3) < 3) {
      deathRow.appendChild(
        el('button', {
          class: 'btn btn--secondary settings-row__reset',
          onclick: () => {
            sfx.click();
            resetLives(character.id);
            render();
          },
        }, [`Reset ${character.name}'s lives to 3`]),
      );
    }
    panel.appendChild(deathRow);

    // ---- Footer actions ----
    panel.appendChild(
      el('div', { class: 'settings-panel__footer' }, [
        el('button', {
          class: 'btn btn--secondary',
          onclick: () => {
            sfx.click();
            close();
          },
        }, ['Resume']),
        el('button', {
          class: 'btn btn--danger',
          onclick: () => {
            sfx.click();
            backdrop.remove();
            opts.onQuit();
          },
        }, ['Quit to menu']),
      ]),
    );
  };

  render();
  document.body.appendChild(backdrop);
  // Focus first interactive control for keyboard users.
  (panel.querySelector('input,button') as HTMLElement | null)?.focus();
}
