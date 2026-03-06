<template>
  <div class="relative w-full h-full">
    <!-- https://codepen.io/shubniggurath/pen/EmMzpp -->
    <canvas ref="canvasRef" class="w-full h-full block" />
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';

class Blob {
  points: Point[] = [];
  mousePos: { x: number; y: number } | null = null;

  private _color: string | null = null;
  private _canvas: HTMLCanvasElement | null = null;
  private _ctx: CanvasRenderingContext2D | null = null;
  private _points = 32;
  private _radius = 150;
  private _position = { x: 0.5, y: 0.5 };
  private _running = true;

  init() {
    for (let i = 0; i < this.numPoints; i++) {
      const point = new Point(this.divisional * (i + 1), this);
      this.push(point);
    }
  }

  render() {
    if (!this._canvas || !this._ctx) return;

    const canvas = this._canvas;
    const ctx = this._ctx;
    const pointsArray = this.points;
    const points = this.numPoints;
    const center = this.center;

    if (!pointsArray.length) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const first = pointsArray[0]!;
    const last = pointsArray[points - 1]!;
    const second = pointsArray[1]!;

    first.solveWith(last, second);

    const p0 = last.position;
    let p1 = first.position;
    const _p2 = p1;

    ctx.beginPath();
    ctx.moveTo(center.x, center.y);
    ctx.moveTo((p0.x + p1.x) / 2, (p0.y + p1.y) / 2);

    for (let i = 1; i < points; i++) {
      const current = pointsArray[i]!;
      const prev = pointsArray[i - 1]!;
      const next = pointsArray[i + 1] ?? first;

      current.solveWith(prev, next);

      const p2 = current.position;
      const xc = (p1.x + p2.x) / 2;
      const yc = (p1.y + p2.y) / 2;
      ctx.quadraticCurveTo(p1.x, p1.y, xc, yc);

      p1 = p2;
    }

    const xc = (p1.x + _p2.x) / 2;
    const yc = (p1.y + _p2.y) / 2;
    ctx.quadraticCurveTo(p1.x, p1.y, xc, yc);

    ctx.fillStyle = this.color as string;
    ctx.fill();

    if (this._running) {
      requestAnimationFrame(this.render.bind(this));
    }
  }

  push(item: Point) {
    this.points.push(item);
  }

  set color(value: string | null) {
    this._color = value ?? null;
  }

  get color() {
    return this._color || 'deeppink';
  }

  set canvas(value: HTMLCanvasElement | null) {
    if (value instanceof HTMLCanvasElement) {
      this._canvas = value;
      this._ctx = value.getContext('2d');
    }
  }
  get canvas() {
    return this._canvas;
  }

  set numPoints(value: number) {
    if (value > 2) {
      this._points = value;
    }
  }
  get numPoints() {
    return this._points || 32;
  }

  set radius(value: number) {
    if (value > 0) {
      this._radius = value;
    }
  }
  get radius() {
    return this._radius || 150;
  }

  set position(value: { x: number; y: number }) {
    if (typeof value === 'object' && 'x' in value && 'y' in value) {
      this._position = value;
    }
  }
  get position() {
    return this._position || { x: 0.5, y: 0.5 };
  }

  get divisional() {
    return (Math.PI * 2) / this.numPoints;
  }

  get center() {
    if (!this._canvas) return { x: 0, y: 0 };
    return { x: this._canvas.width * this.position.x, y: this._canvas.height * this.position.y };
  }

  set running(value: boolean) {
    this._running = value === true;
  }
  get running() {
    return this._running !== false;
  }
}

class Point {
  parent: Blob;
  azimuth: number;
  private _components: { x: number; y: number };
  private _acceleration = 0;
  private _speed = 0;
  private _radialEffect = 0;
  private _elasticity = 0.001;
  private _friction = 0.0085;

  constructor(azimuth: number, parent: Blob) {
    this.parent = parent;
    this.azimuth = Math.PI - azimuth;
    this._components = {
      x: Math.cos(this.azimuth),
      y: Math.sin(this.azimuth),
    };

    this.acceleration = -0.3 + Math.random() * 0.6;
  }

  solveWith(leftPoint: Point, rightPoint: Point) {
    this.acceleration =
      (-0.3 * this.radialEffect +
        (leftPoint.radialEffect - this.radialEffect) +
        (rightPoint.radialEffect - this.radialEffect)) *
        this.elasticity -
      this.speed * this.friction;
  }

  set acceleration(value: number) {
    if (typeof value === 'number') {
      this._acceleration = value;
      this.speed += this._acceleration * 2;
    }
  }
  get acceleration() {
    return this._acceleration || 0;
  }

  set speed(value: number) {
    if (typeof value === 'number') {
      this._speed = value;
      this.radialEffect += this._speed * 5;
    }
  }
  get speed() {
    return this._speed || 0;
  }

  set radialEffect(value: number) {
    if (typeof value === 'number') {
      this._radialEffect = value;
    }
  }
  get radialEffect() {
    return this._radialEffect || 0;
  }

  get position() {
    return {
      x: this.parent.center.x + this.components.x * (this.parent.radius + this.radialEffect),
      y: this.parent.center.y + this.components.y * (this.parent.radius + this.radialEffect),
    };
  }

  get components() {
    return this._components;
  }

  set elasticity(value: number) {
    if (typeof value === 'number') {
      this._elasticity = value;
    }
  }
  get elasticity() {
    return this._elasticity || 0.001;
  }
  set friction(value: number) {
    if (typeof value === 'number') {
      this._friction = value;
    }
  }
  get friction() {
    return this._friction || 0.0085;
  }
}

const canvasRef = ref<HTMLCanvasElement | null>(null);
let blob: Blob | null = null;

onMounted(() => {
  const canvas = canvasRef.value;
  if (!canvas) return;

  blob = new Blob();
  blob.canvas = canvas;

  const handleResize = () => {
    if (!canvasRef.value) return;
    canvasRef.value.width = window.innerWidth;
    canvasRef.value.height = window.innerHeight;
  };

  handleResize();
  window.addEventListener('resize', handleResize);

  let oldMousePoint = { x: 0, y: 0 };
  let hover = false;

  const handlePointerMove = (e: PointerEvent) => {
    if (!blob) return;

    const pos = blob.center;
    const diff = { x: e.clientX - pos.x, y: e.clientY - pos.y };
    const dist = Math.sqrt(diff.x * diff.x + diff.y * diff.y);
    let angle: number | null = null;

    blob.mousePos = { x: pos.x - e.clientX, y: pos.y - e.clientY };

    if (dist < blob.radius && hover === false) {
      const vector = { x: e.clientX - pos.x, y: e.clientY - pos.y };
      angle = Math.atan2(vector.y, vector.x);
      hover = true;
    } else if (dist > blob.radius && hover === true) {
      const vector = { x: e.clientX - pos.x, y: e.clientY - pos.y };
      angle = Math.atan2(vector.y, vector.x);
      hover = false;
      blob.color = null;
    }

    if (typeof angle === 'number') {
      let nearestPoint: Point | null = null;
      let distanceFromPoint = 100;

      blob.points.forEach((point) => {
        if (Math.abs(angle - point.azimuth) < distanceFromPoint) {
          nearestPoint = point;
          distanceFromPoint = Math.abs(angle - point.azimuth);
        }
      });

      if (nearestPoint) {
        const strengthVec = { x: oldMousePoint.x - e.clientX, y: oldMousePoint.y - e.clientY };
        let strength = Math.sqrt(strengthVec.x * strengthVec.x + strengthVec.y * strengthVec.y) * 10;
        if (strength > 100) strength = 100;
        (nearestPoint as Point).acceleration = (strength / 100) * (hover ? -1 : 1);
      }
    }

    oldMousePoint = { x: e.clientX, y: e.clientY };
  };

  window.addEventListener('pointermove', handlePointerMove);

  blob.init();
  blob.render();

  onBeforeUnmount(() => {
    window.removeEventListener('resize', handleResize);
    window.removeEventListener('pointermove', handlePointerMove);
    if (blob) {
      blob.running = false;
    }
  });
});
</script>
