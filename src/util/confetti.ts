/** A simple confetti/petal burst that paints on a full-window canvas. */

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  vrot: number;
  size: number;
  color: string;
  shape: 'rect' | 'petal';
  life: number;
}

const PALETTE = ['#F4A56C', '#FBEFD9', '#7BA888', '#6FB5A8', '#A8E6DC', '#E89554', '#C75D5D'];

export class Confetti {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private particles: Particle[] = [];
  private raf = 0;
  private last = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('No 2d context');
    this.ctx = ctx;
    this.resize();
    window.addEventListener('resize', this.resize);
  }

  private resize = (): void => {
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = this.canvas.clientWidth * dpr;
    this.canvas.height = this.canvas.clientHeight * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  burst(x: number, y: number, count = 60, opts: { spread?: number; power?: number } = {}): void {
    const spread = opts.spread ?? Math.PI * 2;
    const power = opts.power ?? 6;
    for (let i = 0; i < count; i++) {
      const a = -Math.PI / 2 + (Math.random() - 0.5) * spread;
      const v = power * (0.5 + Math.random() * 0.7);
      this.particles.push({
        x,
        y,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v,
        rot: Math.random() * Math.PI * 2,
        vrot: (Math.random() - 0.5) * 0.4,
        size: 6 + Math.random() * 8,
        color: PALETTE[Math.floor(Math.random() * PALETTE.length)] ?? '#F4A56C',
        shape: Math.random() < 0.5 ? 'petal' : 'rect',
        life: 1,
      });
    }
    if (!this.raf) this.start();
  }

  /** Continuously rain petals from the top. */
  rain(): void {
    const w = this.canvas.clientWidth;
    for (let i = 0; i < 4; i++) {
      this.particles.push({
        x: Math.random() * w,
        y: -10,
        vx: (Math.random() - 0.5) * 1.2,
        vy: 1 + Math.random() * 1.5,
        rot: Math.random() * Math.PI * 2,
        vrot: (Math.random() - 0.5) * 0.06,
        size: 6 + Math.random() * 10,
        color: PALETTE[Math.floor(Math.random() * PALETTE.length)] ?? '#F4A56C',
        shape: 'petal',
        life: 1,
      });
    }
    if (!this.raf) this.start();
  }

  private start(): void {
    this.last = performance.now();
    const tick = (t: number): void => {
      const dt = Math.min(48, t - this.last) / 16.67;
      this.last = t;
      this.update(dt);
      this.draw();
      if (this.particles.length > 0) {
        this.raf = requestAnimationFrame(tick);
      } else {
        this.raf = 0;
      }
    };
    this.raf = requestAnimationFrame(tick);
  }

  private update(dt: number): void {
    const h = this.canvas.clientHeight;
    for (const p of this.particles) {
      p.vy += 0.18 * dt;
      p.vx *= 0.995;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.vrot * dt;
      if (p.y > h + 30) p.life = 0;
    }
    this.particles = this.particles.filter((p) => p.life > 0);
  }

  private draw(): void {
    const { ctx } = this;
    ctx.clearRect(0, 0, this.canvas.clientWidth, this.canvas.clientHeight);
    for (const p of this.particles) {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      if (p.shape === 'rect') {
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      } else {
        // soft petal
        ctx.beginPath();
        ctx.ellipse(0, 0, p.size * 0.45, p.size * 0.85, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  destroy(): void {
    if (this.raf) cancelAnimationFrame(this.raf);
    window.removeEventListener('resize', this.resize);
  }
}
