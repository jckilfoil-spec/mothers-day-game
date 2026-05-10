/**
 * Controls help sheet — opened from the `?` button on the gameplay banner.
 *
 * Holds the deeper kbd-matrix detail that we trimmed from the always-on banner
 * (so the banner stays small enough to fit on a 320px-wide phone). Uses the
 * existing `.modal-backdrop` pattern from settings.ts for visual consistency;
 * the sheet itself is styled via `.controls-sheet` + `.controls-grid`.
 */

import { el } from '../util/dom.js';
import { sfx } from '../audio/sounds.js';

export function openControlsSheet(): void {
  const backdrop = el('div', { class: 'modal-backdrop' });

  function close(): void {
    backdrop.remove();
  }

  const sheet = el('div', { class: 'controls-sheet' }, [
    el('h2', {}, ['Controls']),
    el('dl', { class: 'controls-grid' }, [
      el('dt', {}, [
        el('kbd', {}, ['◀']),
        el('kbd', {}, ['▶']),
        ' / ',
        el('kbd', {}, ['A']),
        el('kbd', {}, ['D']),
      ]),
      el('dd', {}, ['Move left / right']),
      el('dt', {}, [
        el('kbd', {}, ['Space']),
        ' / ',
        el('kbd', {}, ['↑']),
      ]),
      el('dd', {}, ['Jump (you can jump up through platforms from below)']),
      el('dt', {}, [el('kbd', {}, ['↓'])]),
      el('dd', {}, ['Drop down through a platform']),
      el('dt', {}, ['Click / tap']),
      el('dd', {}, ['Defeat silly monsters & knock phones off the road']),
    ]),
    el('button', {
      class: 'btn',
      onclick: () => {
        sfx.click();
        close();
      },
    }, ['Got it']),
  ]);

  backdrop.appendChild(sheet);
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) close();
  });

  document.body.appendChild(backdrop);
  // Focus the dismiss button so keyboard users can close with Enter.
  (sheet.querySelector('.btn') as HTMLElement | null)?.focus();
}
