import type { Screen } from '../router.js';
import { el, mount, clear } from '../util/dom.js';
import {
  addCharacter,
  getCharacter,
  updateCharacter,
  selectCharacter,
  DEFAULT_MESSAGE,
} from '../state.js';
import { cropFaceToDataUrl, fileToDataUrl, loadImage } from '../util/face.js';
import { sfx } from '../audio/sounds.js';

/**
 * Add/Edit a character.
 *
 * Steps:
 *   1. Upload a photo (drag/drop or click) — or skip with default silhouette
 *   2. Drag the circle on the photo to frame the face, scroll/slider to resize
 *   3. Name + custom message
 *   4. Save → returns to character manager with this one selected.
 */
export const characterEditorScreen: Screen = (root, nav, route) => {
  const editingId = route.name === 'editor' ? route.characterId : null;
  const editing = editingId ? getCharacter(editingId) : null;

  // Working state
  let sourceImg: HTMLImageElement | null = null;
  let croppedDataUrl: string | null = editing?.faceImage ?? null;
  let cropCenter = { x: 0, y: 0 };
  let cropRadius = 100;
  let drawnImageMetrics = { x: 0, y: 0, scale: 1 };

  const stage = el('div', { class: 'editor__step' });
  const nameStep = el('div', { class: 'editor__step' });
  const wrap = el('div', { class: 'screen' }, [
    el('div', { class: 'screen__header' }, [
      el('button', {
        class: 'screen__back',
        title: 'Back',
        onclick: () => {
          sfx.click();
          nav({ name: 'characters' });
        },
      }, ['‹']),
      el('h1', {}, [editing ? 'Edit character' : 'New character']),
    ]),
    el('div', { class: 'editor' }, [stage, nameStep]),
  ]);

  // ---- Step 1+2 — upload + crop ----
  function renderUpload(): void {
    clear(stage);
    stage.appendChild(el('h2', {}, ['1. Upload a photo']));
    const input = el('input', {
      type: 'file',
      accept: 'image/*',
      class: 'visually-hidden',
      onchange: (e: Event) => {
        const f = (e.target as HTMLInputElement).files?.[0];
        if (f) handleFile(f);
      },
    }) as HTMLInputElement;

    const drop = el('div', {
      class: 'upload-drop',
      onclick: () => input.click(),
      ondragover: (e: Event) => {
        e.preventDefault();
        (e.currentTarget as HTMLElement).classList.add('is-drag');
      },
      ondragleave: (e: Event) => {
        (e.currentTarget as HTMLElement).classList.remove('is-drag');
      },
      ondrop: (e: Event) => {
        e.preventDefault();
        (e.currentTarget as HTMLElement).classList.remove('is-drag');
        const file = (e as DragEvent).dataTransfer?.files?.[0];
        if (file) handleFile(file);
      },
    }, [
      el('div', { class: 'upload-drop__icon' }, ['📷']),
      el('p', {}, ['Click or drag a photo here']),
      el('p', { class: 'muted' }, ['JPG, PNG — anything works.']),
      input,
    ]);

    stage.appendChild(drop);
    stage.appendChild(
      el('p', { class: 'crop-hint' }, [
        'Or ',
        el('button', {
          class: 'btn btn--secondary',
          style: 'height:44px;font-size:1rem;padding:0 18px',
          onclick: () => {
            croppedDataUrl = null;
            renderName();
          },
        }, ['skip and use a silhouette']),
      ]),
    );
  }

  async function handleFile(file: File): Promise<void> {
    try {
      const url = await fileToDataUrl(file);
      sourceImg = await loadImage(url);
      renderCrop();
    } catch (e) {
      console.error('Failed to read file', e);
      alert("That file didn't work. Try another image?");
    }
  }

  function renderCrop(): void {
    if (!sourceImg) return;
    clear(stage);
    stage.appendChild(el('h2', {}, ['2. Frame the face']));

    const canvas = el('canvas', {}) as HTMLCanvasElement;
    const cropStage = el('div', { class: 'crop-stage' }, [canvas]);
    stage.appendChild(cropStage);
    stage.appendChild(
      el('p', { class: 'crop-hint' }, [
        'Drag the circle. Use the slider to resize.',
      ]),
    );

    const sizeRow = el('div', { class: 'field-group', style: 'margin-top:var(--s-4)' }, [
      el('label', { for: 'crop-size' }, ['Size']),
      el('input', {
        id: 'crop-size',
        type: 'range',
        min: '40',
        max: '400',
        value: '120',
        oninput: (e: Event) => {
          cropRadius = Number((e.target as HTMLInputElement).value);
          drawCropStage();
        },
      }),
    ]);
    stage.appendChild(sizeRow);

    const actions = el('div', { class: 'editor__row', style: 'margin-top:var(--s-5)' }, [
      el('button', {
        class: 'btn btn--secondary',
        onclick: renderUpload,
      }, ['Use a different photo']),
      el('button', {
        class: 'btn',
        onclick: () => {
          if (!sourceImg) return;
          croppedDataUrl = cropFaceToDataUrl(sourceImg, cropCenter.x, cropCenter.y, cropRadius);
          sfx.click();
          renderName();
        },
      }, ['Looks good →']),
    ]);
    stage.appendChild(actions);

    // Initial center on the image
    cropCenter = { x: sourceImg.width / 2, y: sourceImg.height / 2 };
    cropRadius = Math.min(sourceImg.width, sourceImg.height) * 0.35;
    (sizeRow.querySelector('input') as HTMLInputElement).value = String(cropRadius);
    (sizeRow.querySelector('input') as HTMLInputElement).max = String(
      Math.min(sourceImg.width, sourceImg.height) / 2,
    );

    function drawCropStage(): void {
      const ctx = canvas.getContext('2d');
      if (!ctx || !sourceImg) return;
      const maxW = cropStage.clientWidth || 600;
      const scale = maxW / sourceImg.width;
      const w = maxW;
      const h = sourceImg.height * scale;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      drawnImageMetrics = { x: 0, y: 0, scale };

      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(sourceImg, 0, 0, w, h);

      // Dim everything except the circle
      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.fillRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath();
      ctx.arc(cropCenter.x * scale, cropCenter.y * scale, cropRadius * scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Outline
      ctx.strokeStyle = '#FBEFD9';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(cropCenter.x * scale, cropCenter.y * scale, cropRadius * scale, 0, Math.PI * 2);
      ctx.stroke();
    }

    drawCropStage();
    window.addEventListener('resize', drawCropStage);

    // Drag to move
    let dragging = false;
    const onDown = (e: PointerEvent): void => {
      dragging = true;
      canvas.setPointerCapture(e.pointerId);
      moveTo(e);
    };
    const moveTo = (e: PointerEvent): void => {
      const rect = canvas.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      cropCenter.x = px / drawnImageMetrics.scale;
      cropCenter.y = py / drawnImageMetrics.scale;
      // Clamp inside the image
      if (sourceImg) {
        cropCenter.x = Math.max(cropRadius, Math.min(sourceImg.width - cropRadius, cropCenter.x));
        cropCenter.y = Math.max(cropRadius, Math.min(sourceImg.height - cropRadius, cropCenter.y));
      }
      drawCropStage();
    };
    const onMove = (e: PointerEvent): void => {
      if (dragging) moveTo(e);
    };
    const onUp = (): void => {
      dragging = false;
    };
    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup', onUp);
    canvas.addEventListener('pointercancel', onUp);
  }

  function renderName(): void {
    clear(nameStep);
    nameStep.appendChild(el('h2', {}, ['3. Name and message']));

    const preview = croppedDataUrl
      ? el('img', {
          class: 'char-card__face',
          src: croppedDataUrl,
          alt: 'Preview',
          style: 'margin:0 auto var(--s-4)',
        })
      : el('div', {
          class: 'char-card__face char-card__face--placeholder',
          style: 'margin:0 auto var(--s-4)',
        }, ['🙂']);
    nameStep.appendChild(preview);

    const nameInput = el('input', {
      id: 'char-name',
      type: 'text',
      value: editing?.name ?? '',
      placeholder: 'Mom',
      maxlength: '30',
      autofocus: true,
    }) as HTMLInputElement;

    const messageInput = el('textarea', {
      id: 'char-msg',
      placeholder: DEFAULT_MESSAGE,
      maxlength: '200',
    }, [editing?.customMessage ?? DEFAULT_MESSAGE]) as HTMLTextAreaElement;

    nameStep.appendChild(
      el('div', { class: 'field-group', style: 'margin-bottom:var(--s-4)' }, [
        el('label', { for: 'char-name' }, ['Name']),
        nameInput,
      ]),
    );
    nameStep.appendChild(
      el('div', { class: 'field-group', style: 'margin-bottom:var(--s-4)' }, [
        el('label', { for: 'char-msg' }, ['Custom Mother’s Day message (shown when you win)']),
        messageInput,
      ]),
    );

    nameStep.appendChild(
      el('div', { class: 'editor__row' }, [
        croppedDataUrl
          ? el('button', {
              class: 'btn btn--secondary',
              onclick: () => {
                if (sourceImg) renderCrop();
                else renderUpload();
              },
            }, ['← Re-crop photo'])
          : el('button', {
              class: 'btn btn--secondary',
              onclick: renderUpload,
            }, ['← Add a photo']),
        el('button', {
          class: 'btn',
          onclick: () => {
            const name = nameInput.value.trim() || 'Mom';
            const message = messageInput.value.trim() || DEFAULT_MESSAGE;
            if (editing) {
              updateCharacter(editing.id, {
                name,
                customMessage: message,
                ...(croppedDataUrl !== editing.faceImage ? { faceImage: croppedDataUrl } : {}),
              });
              selectCharacter(editing.id);
            } else {
              const c = addCharacter({ name, faceImage: croppedDataUrl, customMessage: message });
              selectCharacter(c.id);
            }
            sfx.click();
            nav({ name: 'characters' });
          },
        }, [editing ? 'Save' : 'Save & pick']),
      ]),
    );
  }

  if (editing && editing.faceImage) {
    // Editing existing — go straight to name/message
    renderName();
    stage.appendChild(el('h2', {}, ['Photo']));
    stage.appendChild(
      el('p', { class: 'crop-hint' }, [
        'Want to change the photo? ',
        el('button', {
          class: 'btn btn--secondary',
          style: 'height:44px;font-size:1rem;padding:0 18px',
          onclick: renderUpload,
        }, ['Pick a new one']),
      ]),
    );
  } else {
    renderUpload();
  }

  mount(root, wrap);
};
