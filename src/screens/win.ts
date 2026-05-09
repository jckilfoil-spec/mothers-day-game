import type { Screen } from '../router.js';
import { el, mount } from '../util/dom.js';
import { getSelectedCharacter } from '../state.js';
import { Confetti } from '../util/confetti.js';
import { sfx } from '../audio/sounds.js';

/** Win screen with confetti, big greeting, custom message, and four follow-up buttons. */
export const winScreen: Screen = (root, nav, route) => {
  const map = route.name === 'win' ? route.map : 'mountain';
  const character = getSelectedCharacter();
  if (!character) {
    nav({ name: 'characters' });
    return;
  }

  const confettiCanvas = el('canvas', {}) as HTMLCanvasElement;
  const confettiWrap = el('div', { class: 'win__confetti' }, [confettiCanvas]);

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
    el('p', { class: 'win__greeting' }, ["Happy Mother's Day,"]),
    el('h1', { class: 'win__name' }, [character.name + '!']),
    el('p', { class: 'win__msg' }, [character.customMessage]),
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
    window.removeEventListener('resize', sizeConfetti);
  };
};
