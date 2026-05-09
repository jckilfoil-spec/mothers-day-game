import type { Screen } from '../router.js';
import { el, mount } from '../util/dom.js';
import { getSelectedCharacter } from '../state.js';
import { Confetti } from '../util/confetti.js';
import { sfx } from '../audio/sounds.js';
import { formatTime } from '../util/time.js';

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
            } catch {
              // User canceled — no-op. Don't surface AbortError.
            }
          },
        }, ['📤 Share'])
      : null,
  ]);

  const card = el('div', { class: 'win__card' }, [
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
    el('h1', { class: 'win__name' }, [`Happy Mother's Day, ${character.name}!`]),
    elapsedMs && elapsedMs > 0
      ? el('p', { class: 'win__time' }, [
          el('span', { class: 'win__time-label' }, ['Finished in']),
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
      el('button', {
        class: 'btn btn--secondary',
        onclick: () => {
          sfx.click();
          nav({ name: 'characters' });
        },
      }, ['Pick someone else']),
    ]),
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

  const confetti = new Confetti(confettiCanvas);
  // Initial burst from the center
  setTimeout(() => {
    confetti.burst(window.innerWidth / 2, window.innerHeight / 2 - 60, 80, { spread: Math.PI * 2, power: 9 });
  }, 60);
  // Slow rain afterwards
  const rainTimer = window.setInterval(() => confetti.rain(), 200);

  return () => {
    confetti.destroy();
    window.clearInterval(rainTimer);
    window.clearTimeout(copyResetTimer);
    window.removeEventListener('resize', sizeConfetti);
  };
};
