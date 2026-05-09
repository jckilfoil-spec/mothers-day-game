/** Input handler — keyboard + touch. Aggregates state for the game loop to consume. */

import type { InputState } from './types.js';

export type ClickHandler = (canvasX: number, canvasY: number) => void;

export class Input {
  state: InputState = {
    left: false,
    right: false,
    jump: false,
    jumpPressed: false,
    clickWorld: null,
  };

  private canvas: HTMLCanvasElement;
  private onClick: ClickHandler;
  private cleanups: (() => void)[] = [];
  private jumpEdge = false;

  constructor(canvas: HTMLCanvasElement, onClick: ClickHandler) {
    this.canvas = canvas;
    this.onClick = onClick;
    this.bind();
  }

  private bind(): void {
    const onKeyDown = (e: KeyboardEvent): void => {
      if (e.repeat) return;
      switch (e.key) {
        case 'ArrowLeft':
        case 'a':
        case 'A':
          this.state.left = true;
          e.preventDefault();
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          this.state.right = true;
          e.preventDefault();
          break;
        case ' ':
        case 'ArrowUp':
        case 'w':
        case 'W':
          if (!this.state.jump) this.jumpEdge = true;
          this.state.jump = true;
          e.preventDefault();
          break;
      }
    };
    const onKeyUp = (e: KeyboardEvent): void => {
      switch (e.key) {
        case 'ArrowLeft':
        case 'a':
        case 'A':
          this.state.left = false;
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          this.state.right = false;
          break;
        case ' ':
        case 'ArrowUp':
        case 'w':
        case 'W':
          this.state.jump = false;
          break;
      }
    };
    const onClickEvt = (e: PointerEvent): void => {
      // Only fire for primary click/tap
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      const rect = this.canvas.getBoundingClientRect();
      this.onClick(e.clientX - rect.left, e.clientY - rect.top);
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    this.canvas.addEventListener('pointerdown', onClickEvt);
    this.cleanups.push(() => window.removeEventListener('keydown', onKeyDown));
    this.cleanups.push(() => window.removeEventListener('keyup', onKeyUp));
    this.cleanups.push(() => this.canvas.removeEventListener('pointerdown', onClickEvt));
  }

  /** Add a UI button that simulates a key — useful for mobile on-screen controls. */
  bindButton(button: HTMLElement, key: 'left' | 'right' | 'jump'): void {
    const press = (e: Event): void => {
      e.preventDefault();
      if (key === 'jump' && !this.state.jump) this.jumpEdge = true;
      this.state[key] = true;
    };
    const release = (e: Event): void => {
      e.preventDefault();
      this.state[key] = false;
    };
    button.addEventListener('pointerdown', press);
    button.addEventListener('pointerup', release);
    button.addEventListener('pointercancel', release);
    button.addEventListener('pointerleave', release);
    this.cleanups.push(() => button.removeEventListener('pointerdown', press));
    this.cleanups.push(() => button.removeEventListener('pointerup', release));
    this.cleanups.push(() => button.removeEventListener('pointercancel', release));
    this.cleanups.push(() => button.removeEventListener('pointerleave', release));
  }

  /** Call once per frame to consume edge events into the InputState. */
  beginFrame(): void {
    this.state.jumpPressed = this.jumpEdge;
    this.jumpEdge = false;
  }

  destroy(): void {
    for (const c of this.cleanups) c();
    this.cleanups = [];
  }
}
