import type { Screen } from '../router.js';
import { el, mount } from '../util/dom.js';
import { getSelectedCharacter, getSettings } from '../state.js';
import { Confetti } from '../util/confetti.js';
import { sfx } from '../audio/sounds.js';
import { formatTime } from '../util/time.js';
import { track } from '../analytics.js';

const SHARE_URL = 'https://jckilfoil-spec.github.io/mothers-day-game/';
const SHARE_TITLE = "Happy Mother's Day! 💌";
const SHARE_TEXT = "Happy Mother's Day! 💌 Made you something — check it out:";
const COPIED_DURATION_MS = 2000;
const COPY_LABEL = '🔗 Copy Link';

/** Win screen with confetti, big greeting, custom message, and four follow-up buttons. */
export const winScreen: Screen = (root, nav, route) => {
  const map = route.name === 'win' ? route.map : 'mountain';
  const elapsedMs = route.name === 'win' ? route.elapsedMs : undefined;
  const character = getSelectedCharacter();
  if (!character) {
    nav({ name: 'characters' });
    return;
  }

  // Final celebration screen — emit `game_finished` once per win render.
  // We approximate `total_duration_ms` with the per-level elapsed since the codebase
  // doesn't track multi-level sessions; `levels_completed` is always 1 per run.
  track('game_finished', {
    total_duration_ms: elapsedMs ?? 0,
    levels_completed: 1,
  });

  const confettiCanvas = el('canvas', {}) as HTMLCanvasElement;
  const confettiWrap = el('div', { class: 'win__confetti' }, [confettiCanvas]);

  // Share row — Copy Link is always present; native Share only if the API exists.
  let copyResetTimer = 0;
  const copyBtn = el('button', {
    class: 'win__share-btn win__share-btn--primary',
    type: 'button',
    onclick: async () => {
      sfx.click();
      try {
        await navigator.clipboard.writeText(SHARE_URL);
      } catch {
        // Non-HTTPS, denied permission, or no Clipboard API — fall back to a prompt.
        window.prompt('Copy this link:', SHARE_URL);
        return;
      }
      track('share_link_copied');
      copyBtn.textContent = '✓ Copied!';
      copyBtn.classList.add('win__share-btn--copied');
      window.clearTimeout(copyResetTimer);
      copyResetTimer = window.setTimeout(() => {
        copyBtn.textContent = COPY_LABEL;
        copyBtn.classList.remove('win__share-btn--copied');
      }, COPIED_DURATION_MS);
    },
  }, [COPY_LABEL]);
  const hasNativeShare = typeof navigator !== 'undefined' && 'share' in navigator;
  const shareRow = el('div', { class: 'win__share' }, [
    copyBtn,
    hasNativeShare
      ? el('button', {
          class: 'win__share-btn win__share-btn--secondary',
          type: 'button',
          onclick: async () => {
            sfx.click();
            try {
              await navigator.share({ title: SHARE_TITLE, text: SHARE_TEXT, url: SHARE_URL });
              track('share_native_used');
            } catch {
              // User canceled — no-op. Don't surface AbortError.
            }
          },
        }, ['📤 Share'])
      : null,
  ]);

  const sourceLink = el('a', {
    class: 'source-link',
    href: 'https://github.com/jckilfoil-spec/mothers-day-game',
    target: '_blank',
    rel: 'noopener',
  }, [
    el('span', { class: 'source-link-line1' }, ['✨ made with ❤ — fork it for YOUR mom']),
  ]);

  const card = el('div', { class: 'win__card' }, [
    el('div', { class: 'win__intro' }, [
      character.faceImage
        ? el('img', {
            class: 'win__face',
            src: character.faceImage,
            alt: character.name,
          })
        : el('div', {
            class: 'win__face char-card__face--placeholder',
          }, ['🙂']),
      el('p', { class: 'win__greeting' }, ['We made it. I had to tell you —']),
    ]),
    el('h1', { class: 'win__name' }, [`Happy Mother's Day, ${character.name}!`]),
    elapsedMs && elapsedMs > 0
      ? el('p', { class: 'win__time' }, [
          'Finished in ',
          el('span', { class: 'win__time-value' }, [formatTime(elapsedMs)]),
        ])
      : null,
    el('p', { class: 'win__msg' }, [character.customMessage]),
    shareRow,
    el('p', { class: 'win__hint' }, ['Take a beat. Then —']),
    el('div', { class: 'win__buttons' }, [
      el('button', {
        class: 'btn',
        onclick: () => {
          sfx.click();
          nav({ name: 'game', map });
        },
      }, ['Play again']),
      el('button', {
        class: 'btn btn--secondary',
        onclick: () => {
          sfx.click();
          nav({ name: 'mapSelect' });
        },
      }, ['Other adventure']),
    ]),
    sourceLink,
  ]);

  const wrap = el('div', { class: 'win' }, [confettiWrap, card]);
  mount(root, wrap);

  // Resize the confetti canvas to fit
  const sizeConfetti = (): void => {
    confettiCanvas.style.width = '100%';
    confettiCanvas.style.height = '100%';
  };
  sizeConfetti();
  window.addEventListener('resize', sizeConfetti);

  // Confetti is the showpiece motion on the win screen. With `reduceMotion`
  // on (or OS prefers-reduced-motion), instantiate the engine for cleanup
  // parity but skip the burst + the recurring rain timer so the canvas
  // stays still.
  const confetti = new Confetti(confettiCanvas);
  let rainTimer = 0;
  if (!getSettings().reduceMotion) {
    setTimeout(() => {
      confetti.burst(window.innerWidth / 2, window.innerHeight / 2 - 60, 80, { spread: Math.PI * 2, power: 9 });
    }, 60);
    rainTimer = window.setInterval(() => confetti.rain(), 200);
  }

  return () => {
    confetti.destroy();
    if (rainTimer) window.clearInterval(rainTimer);
    window.clearTimeout(copyResetTimer);
    window.removeEventListener('resize', sizeConfetti);
  };
};
