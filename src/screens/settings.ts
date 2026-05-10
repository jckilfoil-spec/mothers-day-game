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
  setReduceMotion,
  setHighContrast,
  setLargeText,
  setScreenShake,
  setAudioCues,
  setPrototypeDifficulty,
  toggleUiSection,
  getSelectedCharacter,
  resetLives,
  getCharacters,
  selectCharacter,
  type Difficulty,
} from '../state.js';
import { sfx, setMuted as audioSetMuted, setAudioCues as audioSetAudioCues } from '../audio/sounds.js';

export interface SettingsOpts {
  /** Called whenever the user changes a setting that the running game cares about
   *  (zoom, death mode). Game uses this to re-apply scale immediately. */
  onSettingsChange?: () => void;
  /** Called when the user picks a different character. Host should refresh the
   *  in-game face + chip; the run continues uninterrupted. */
  onSwitchCharacter?: () => void;
  /** Called when the user picks "Create new". Host should destroy the game and
   *  navigate to the character editor. The current run is forfeit. */
  onCreateNewCharacter?: () => void;
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

    // ---- Character switcher ----
    const allChars = getCharacters();
    const characterPicks = el('div', { class: 'settings-row__characters' });
    for (const c of allChars) {
      const isActive = character?.id === c.id;
      const tile = el('button', {
        class: 'settings-char-pick' + (isActive ? ' is-selected' : ''),
        title: isActive ? `Playing as ${c.name}` : `Switch to ${c.name}`,
        onclick: () => {
          if (isActive) return;
          sfx.click();
          selectCharacter(c.id);
          opts.onSwitchCharacter?.();
          render();
        },
      }, [
        c.faceImage
          ? el('img', { src: c.faceImage, alt: c.name })
          : el('span', { class: 'settings-char-pick__placeholder' }, ['🙂']),
        el('span', { class: 'settings-char-pick__name' }, [c.name]),
      ]);
      characterPicks.appendChild(tile);
    }
    // "+ Create new" tile (always last)
    characterPicks.appendChild(
      el('button', {
        class: 'settings-char-pick settings-char-pick--add',
        title: 'Create a new character (exits this run)',
        onclick: () => {
          sfx.click();
          backdrop.remove();
          opts.onCreateNewCharacter?.();
        },
      }, [
        el('span', { class: 'settings-char-pick__plus' }, ['+']),
        el('span', { class: 'settings-char-pick__name' }, ['New', el('br', {}), '(exits)']),
      ]),
    );
    panel.appendChild(
      el('div', { class: 'settings-row settings-row--stacked' }, [
        el('label', {}, ['Hero']),
        characterPicks,
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

    // ---- Collapsible: Controls ----
    panel.appendChild(makeCollapsibleSection({
      id: 'controls',
      title: 'Controls',
      open: s.uiOpenSections.includes('controls'),
      body: makeControlsBody(),
      onToggle: () => {
        sfx.click();
        toggleUiSection('controls');
        render();
      },
    }));

    // ---- Collapsible: Accessibility ----
    panel.appendChild(makeCollapsibleSection({
      id: 'a11y',
      title: 'Accessibility',
      open: s.uiOpenSections.includes('a11y'),
      body: makeA11yBody(s, () => {
        opts.onSettingsChange?.();
        render();
      }),
      onToggle: () => {
        sfx.click();
        toggleUiSection('a11y');
        render();
      },
    }));

    // ---- Collapsible: Open World difficulty (easter egg) ----
    // Per design: don't surface difficulty on map entry; only discoverable here.
    // Effective only on the sky-beach prototype map; the 4 solid maps ignore it.
    panel.appendChild(makeCollapsibleSection({
      id: 'openworld',
      title: 'Open World 🌴',
      open: s.uiOpenSections.includes('openworld'),
      body: makeDifficultyBody(s.prototypeDifficulty, () => {
        opts.onSettingsChange?.();
        render();
      }),
      onToggle: () => {
        sfx.click();
        toggleUiSection('openworld');
        render();
      },
    }));

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

/** Generic collapsible section, used by Controls + Accessibility. The body is
 *  re-mounted on every render() so toggle handlers can update local state and
 *  trigger a re-render naturally. */
function makeCollapsibleSection(opts: {
  id: string;
  title: string;
  open: boolean;
  body: HTMLElement;
  onToggle: () => void;
}): HTMLElement {
  const wrap = el('div', { class: 'settings-section' + (opts.open ? ' is-open' : '') });
  const header = el('button', {
    class: 'settings-section-header',
    type: 'button',
    'aria-expanded': opts.open ? 'true' : 'false',
    'aria-controls': `settings-section-${opts.id}`,
    onclick: opts.onToggle,
  }, [
    el('span', { class: 'settings-section-arrow' }, [opts.open ? '▾' : '▸']),
    el('span', { class: 'settings-section-title' }, [opts.title]),
  ]);
  wrap.appendChild(header);
  if (opts.open) {
    const body = el('div', {
      class: 'settings-section-body',
      id: `settings-section-${opts.id}`,
    }, [opts.body]);
    wrap.appendChild(body);
  }
  return wrap;
}

function makeControlsBody(): HTMLElement {
  return el('dl', { class: 'settings-controls' }, [
    el('dt', {}, [
      el('kbd', {}, ['◀']), el('kbd', {}, ['▶']),
      ' / ',
      el('kbd', {}, ['A']), el('kbd', {}, ['D']),
    ]),
    el('dd', {}, ['Move left / right']),
    el('dt', {}, [el('kbd', {}, ['Space']), ' / ', el('kbd', {}, ['↑'])]),
    el('dd', {}, ['Jump — you can jump up through platforms from below']),
    el('dt', {}, [el('kbd', {}, ['↓'])]),
    el('dd', {}, ['Drop down through a platform']),
    el('dt', {}, ['Click / tap']),
    el('dd', {}, ['Defeat silly monsters & knock phones off the road']),
  ]);
}

function makeA11yBody(
  s: ReturnType<typeof getSettings>,
  onChange: () => void,
): HTMLElement {
  // Each toggle: persists, applies live (body class or audio gain), then re-renders
  // so the on/off label updates.
  function row(label: string, hint: string, current: boolean, apply: (next: boolean) => void): HTMLElement {
    return el('div', { class: 'settings-row settings-row--stacked' }, [
      el('div', { class: 'settings-row__line' }, [
        el('label', {}, [label]),
        el('button', {
          type: 'button',
          class: 'toggle' + (current ? ' is-on' : ''),
          onclick: () => {
            const next = !current;
            apply(next);
            sfx.click();
            onChange();
          },
        }, [current ? 'On' : 'Off']),
      ]),
      el('p', { class: 'settings-row__hint' }, [hint]),
    ]);
  }

  return el('div', { class: 'settings-a11y' }, [
    row(
      'Reduce motion',
      'Disables confetti, bounce-in, and parallax. Defaults to your OS prefers-reduced-motion setting.',
      s.reduceMotion,
      (next) => {
        setReduceMotion(next);
        document.body.classList.toggle('reduce-motion', next);
      },
    ),
    row(
      'High contrast',
      'Bumps the contrast on HUD text + panel borders.',
      s.highContrast,
      (next) => {
        setHighContrast(next);
        document.body.classList.toggle('hc', next);
      },
    ),
    row(
      'Larger text',
      'Bumps HUD, banner, and settings text by ~15%.',
      s.largeText,
      (next) => {
        setLargeText(next);
        document.body.classList.toggle('lg-text', next);
      },
    ),
    row(
      'Screen shake',
      'Future hazards may shake the camera; turn off to disable.',
      s.screenShake,
      (next) => {
        setScreenShake(next);
      },
    ),
    row(
      'Audio cues',
      'Damage and victory stingers play even with sound muted, for low-vision players.',
      s.audioCues,
      (next) => {
        setAudioCues(next);
        audioSetAudioCues(next);
      },
    ),
  ]);
}

function makeDifficultyBody(current: Difficulty, onChange: () => void): HTMLElement {
  const opts: { id: Difficulty; title: string; hp: string; flavor: string }[] = [
    { id: 'easy', title: 'Easy', hp: '20 HP', flavor: 'Stroll the cloud layers. Goal opens whenever you arrive.' },
    { id: 'medium', title: 'Medium', hp: '10 HP', flavor: '2× enemies. Goal opens whenever you arrive.' },
    { id: 'hard', title: 'Hard', hp: '5 HP', flavor: '3× enemies. Goal locked until you defeat 50 enemies.' },
  ];
  return el('div', { class: 'settings-difficulty' }, [
    el('p', { class: 'settings-row__hint' }, [
      'Sky Beach (Beta) only. The 4 solid maps ignore this. Settings change applies on next entry.',
    ]),
    ...opts.map((opt) =>
      el('button', {
        type: 'button',
        class: 'difficulty-card' + (opt.id === current ? ' is-last-pick' : ''),
        onclick: () => {
          setPrototypeDifficulty(opt.id);
          sfx.click();
          onChange();
        },
      }, [
        el('div', { class: 'difficulty-card__head' }, [
          el('span', { class: 'difficulty-card__title' }, [opt.title]),
          el('span', { class: 'difficulty-card__hp' }, [opt.hp]),
        ]),
        el('p', { class: 'difficulty-card__flavor' }, [opt.flavor]),
      ]),
    ),
  ]);
}
