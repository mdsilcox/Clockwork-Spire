// The RigHub: one shared WebGL context that draws every painted character and is composited into the Canvas 2D
// stage each frame (D-033, docs/spike-art.md; a typed port of the spike's rig-shared.js). B8 CONTRACT: the API is
// fixed (additions only: `ready()` on a handle, the stats and context-loss hooks on the hub); the rig-hub lane implements it.
//
// How a frame goes: for each live rig the character's pose() is advanced and its mesh deformed on the CPU; `under`
// effects draw into the stage; every rig draws into its own viewport of the shared GL canvas; each viewport is copied
// into the stage with drawImage; `over` effects draw into the stage. Anchors come back in stage CSS pixels.
import { MANIFEST } from '../art/manifest';
import type { CharacterDef, Pose, RigView } from '../art/types';

export interface RigRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface RigHandle {
  setMood(mood: string): void;
  /** Mark enemy parts broken (draws the notched broken look at their anchors). */
  setBroken(partIds: string[]): void;
  /** Crossfade a stacked layer (0..1), e.g. the Foreman's phase 2. */
  setLayer(name: string, mix: number): void;
  setRect(rect: RigRect): void;
  /** An anchor's current position in stage CSS pixels: [x, y, radius], or null before the first frame. */
  anchor(id: string): [number, number, number] | null;
  /** True once the painting is on the GPU and the context is live: only then does the hub draw this rig. */
  ready(): boolean;
  dispose(): void;
}

export interface RigStats {
  ready: boolean;
  /** Def ids the hub drew in the last frame. */
  painted: string[];
  /** Milliseconds of rig work (hub.frame) per frame since the last reset. */
  samples: number[];
  /** Frames with at least one rig drawn, cumulative. */
  draws: number;
}

export interface RigHub {
  add(def: CharacterDef, rect: RigRect): RigHandle;
  /** Draw every live rig into the stage, once per stage frame (`now` in seconds; the ctx carries the DPR base transform). */
  frame(ctx: CanvasRenderingContext2D, now: number, over?: CanvasRenderingContext2D): void;
  /** Put the WebGL layer right after the stage canvas (same CSS box); it sits between that canvas and whatever follows. */
  mount(anchor: HTMLCanvasElement): HTMLCanvasElement | null;
  unmount(): void;
  resize(width: number, height: number, dpr: number): void;
  /** Fetch and decode an act's textures ahead of time (0 = Bellfoot and the player). */
  loadAct(act: 0 | 1 | 2 | 3): Promise<void>;
  /** True when WebGL is available and the context is live (otherwise the stage draws the code fallback). */
  ready(): boolean;
  stats(): RigStats;
  resetStats(): void;
  /** Test hooks: simulate losing and getting back the WebGL context. */
  loseContext(): void;
  restoreContext(): void;
}

const BASE: string = (typeof import.meta !== 'undefined' && (import.meta as { env?: { BASE_URL?: string } }).env?.BASE_URL) || '/';
const urlOf = (path: string): string => BASE + path;

// ---------- images (shared by every hub and handle) ----------

interface Img {
  el: HTMLImageElement;
  /** The painting premultiplied and decoded once, uploaded to the GPU without a conversion pass (null if createImageBitmap failed). */
  bmp: ImageBitmap | null;
  /** Alpha of the intact painting, read lazily at the image own size. */
  alpha: ImageData | null;
}
const images = new Map<string, Promise<Img>>();
const loaded = new Map<string, Img>();

function loadImage(path: string): Promise<Img> {
  const hit = images.get(path);
  if (hit) return hit;
  const p = new Promise<Img>((resolve, reject) => {
    const el = new Image();
    el.onload = () => {
      const img: Img = { el, alpha: null, bmp: null };
      const done = (): void => {
        loaded.set(path, img);
        resolve(img);
      };
      createImageBitmap(el, { premultiplyAlpha: 'premultiply', colorSpaceConversion: 'none' })
        .then((bmp) => {
          img.bmp = bmp;
          done();
        })
        .catch(done);
    };
    el.onerror = () => {
      images.delete(path);
      reject(new Error(`could not load ${path}`));
    };
    el.src = urlOf(path);
  });
  images.set(path, p);
  p.catch(() => {});
  return p;
}

function alphaOf(img: Img): ImageData | null {
  if (img.alpha) return img.alpha;
  const cv = document.createElement('canvas');
  cv.width = img.el.naturalWidth;
  cv.height = img.el.naturalHeight;
  const g = cv.getContext('2d', { willReadFrequently: true });
  if (!g) return null;
  g.drawImage(img.el, 0, 0);
  img.alpha = g.getImageData(0, 0, cv.width, cv.height);
  return img.alpha;
}

// ---------- the hub ----------

interface Mesh {
  rest: Float32Array;
  uv: Float32Array;
  wts: Record<string, number>[];
  tri: Uint16Array;
  uvBuf: WebGLBuffer | null;
  triBuf: WebGLBuffer | null;
}

interface Tex {
  tex: WebGLTexture | null;
  /** The loaded image this texture was made from. */
  img: Img;
}

class Handle implements RigHandle {
  rect: RigRect;
  mood: string;
  live: Record<string, number> = {};
  view: RigView;
  broken: Record<string, boolean> = {};
  brokenKey = '';
  brokenDirty = false;
  brokenTex: WebGLTexture | null = null;
  layerMix: Record<string, number> = {};
  verts: Float32Array;
  posBuf: WebGLBuffer | null = null;
  base: Tex | null = null;
  layers: Record<string, Tex> = {};
  t0 = -1;
  last = 0;
  lastP: Pose | null = null;
  gone = false;
  /** True when this frame re-meshed the rig (its vertices need uploading). */
  fresh = true;
  mesh: Mesh;

  constructor(
    private hub: Hub,
    readonly def: CharacterDef,
    rect: RigRect,
  ) {
    this.rect = rect;
    this.mood = def.moods.idle ? 'idle' : Object.keys(def.moods)[0];
    this.live = { ...def.moods[this.mood] };
    this.mesh = hub.meshFor(def);
    this.verts = new Float32Array(this.mesh.rest.length);
    this.view = {
      mood: this.mood,
      state: { broken: this.broken },
      lastP: null,
      point: (x, y, P) => def.deform(x, y, def.weights(x, y), P),
      alpha: (x, y) => this.alphaAt(x, y),
      image: null,
      sprites: {},
      layers: this.layerMix,
    };
    def.onMood?.(this.mood, this.view);
    this.view.state.broken = this.broken;
  }

  private alphaAt(x: number, y: number): number {
    const img = loaded.get(this.def.texture.regular);
    if (!img) return 0;
    const a = alphaOf(img);
    if (!a) return 0;
    const ix = Math.round((x * a.width) / this.def.size[0]);
    const iy = Math.round((y * a.height) / this.def.size[1]);
    if (ix < 0 || iy < 0 || ix >= a.width || iy >= a.height) return 0;
    return a.data[(iy * a.width + ix) * 4 + 3];
  }

  setMood(mood: string): void {
    if (!this.def.moods[mood]) return;
    this.mood = mood;
    this.view.mood = mood;
    this.view.state = { broken: this.broken };
    this.def.onMood?.(mood, this.view);
    this.view.state.broken = this.broken;
  }

  setBroken(ids: string[]): void {
    const notched = this.def.notches ?? {};
    const next: Record<string, boolean> = {};
    for (const id of ids) next[id] = true;
    for (const k of Object.keys(this.broken)) delete this.broken[k];
    Object.assign(this.broken, next);
    const key = ids.filter((id) => notched[id]).sort().join(',');
    if (key !== this.brokenKey) {
      this.brokenKey = key;
      this.brokenDirty = true;
    }
  }

  setLayer(name: string, mix: number): void {
    this.layerMix[name] = Math.min(1, Math.max(0, mix));
  }

  setRect(rect: RigRect): void {
    this.rect = rect;
  }

  anchor(id: string): [number, number, number] | null {
    const a = this.def.anchors[id];
    const P = this.lastP;
    if (!a || !P) return null;
    const [PX, PY] = this.def.pad;
    const WW = this.def.size[0] + 2 * PX;
    const WH = this.def.size[1] + 2 * PY;
    const [dx, dy] = this.def.deform(a[0], a[1], this.def.weights(a[0], a[1]), P);
    const q = this.rect;
    return [q.x + ((dx + PX) / WW) * q.w, q.y + ((dy + PY) / WH) * q.h, (a[2] / WW) * q.w];
  }

  ready(): boolean {
    return !this.gone && this.hub.ready() && this.base !== null && this.base.tex !== null;
  }

  dispose(): void {
    this.gone = true;
    this.hub.release(this);
  }
}

class Hub implements RigHub {
  private glc: HTMLCanvasElement | null = null;
  private gl: WebGLRenderingContext | null = null;
  private uBox: WebGLUniformLocation | null = null;
  private uFlash: WebGLUniformLocation | null = null;
  private uAlpha: WebGLUniformLocation | null = null;
  private lost = false;
  /** False until the driver warm-up (warmUpDriver) is over. */
  private warm = false;
  /** Kept from the start: a lost context hands out no extensions, and restoring needs this one. */
  private loseExt: WEBGL_lose_context | null = null;
  private dpr = 1;
  private handles: Handle[] = [];
  private meshes = new Map<string, Mesh>();
  private texs = new Map<string, Tex>();
  private samples: number[] = [];
  private painted: string[] = [];
  private draws = 0;
  private tick = 0;
  /** True while the GL layer still shows a painted frame (so it is cleared when the last rig leaves). */
  private glDirty = false;
  private lastBoxes: [number, number, number, number][] = [];

  constructor() {
    if (typeof document === 'undefined') return;
    // The WebGL canvas is a layer of the page, stacked between the stage's two 2D canvases (mount): the paintings are never
    // copied into a 2D canvas, which costs a GPU readback (a "GPU stall due to ReadPixels" warning) in Chrome.
    const glc = document.createElement('canvas');
    glc.width = 2;
    glc.height = 2;
    glc.setAttribute('aria-hidden', 'true');
    glc.style.pointerEvents = 'none';
    glc.style.display = 'none'; // shown with the first painted frame
    const gl = glc.getContext('webgl', { premultipliedAlpha: true, alpha: true, antialias: false });
    if (!gl) return;
    this.glc = glc;
    this.gl = gl;
    this.loseExt = gl.getExtension('WEBGL_lose_context');
    glc.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      this.lost = true;
    });
    glc.addEventListener('webglcontextrestored', () => {
      this.initProgram();
      this.rebuildAll();
      this.lost = false;
    });
    this.initProgram();
    void warmUpDriver().then(() => (this.warm = true));
  }

  ready(): boolean {
    return this.warm && !!this.gl && !this.lost && !this.gl.isContextLost();
  }

  // ----- GL resources -----

  private shader(type: number, src: string): WebGLShader {
    const gl = this.gl as WebGLRenderingContext;
    const s = gl.createShader(type) as WebGLShader;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    return s;
  }

  private initProgram(): void {
    const gl = this.gl as WebGLRenderingContext;
    const p = gl.createProgram() as WebGLProgram;
    // The pad offsets and sizes are per rig, so they are uniforms.
    gl.attachShader(
      p,
      this.shader(
        gl.VERTEX_SHADER,
        `attribute vec2 a_pos; attribute vec2 a_uv; varying vec2 v_uv; uniform vec4 u_box;
         void main(){ v_uv=a_uv; vec2 c=(a_pos+u_box.xy)/u_box.zw*2.0-1.0; gl_Position=vec4(c.x,-c.y,0.0,1.0); }`,
      ),
    );
    gl.attachShader(
      p,
      this.shader(
        gl.FRAGMENT_SHADER,
        `precision mediump float; varying vec2 v_uv; uniform sampler2D t; uniform float u_flash; uniform float u_alpha;
         void main(){ vec4 c=texture2D(t,v_uv); c.rgb=mix(c.rgb,vec3(c.a),u_flash); gl_FragColor=c*u_alpha; }`,
      ),
    );
    gl.bindAttribLocation(p, 0, 'a_pos');
    gl.bindAttribLocation(p, 1, 'a_uv');
    gl.linkProgram(p);
    gl.useProgram(p);
    this.uBox = gl.getUniformLocation(p, 'u_box');
    this.uFlash = gl.getUniformLocation(p, 'u_flash');
    this.uAlpha = gl.getUniformLocation(p, 'u_alpha');
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  }

  private makeTexture(src: TexImageSource, premultiplied = false): WebGLTexture | null {
    const gl = this.gl as WebGLRenderingContext;
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, !premultiplied);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return tex;
  }

  private uploadMesh(m: Mesh): void {
    const gl = this.gl as WebGLRenderingContext;
    m.triBuf = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, m.triBuf);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, m.tri, gl.STATIC_DRAW);
    m.uvBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, m.uvBuf);
    gl.bufferData(gl.ARRAY_BUFFER, m.uv, gl.STATIC_DRAW);
  }

  private uploadHandle(h: Handle): void {
    const gl = this.gl as WebGLRenderingContext;
    h.posBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, h.posBuf);
    gl.bufferData(gl.ARRAY_BUFFER, h.verts, gl.DYNAMIC_DRAW);
  }

  /** After a context restore: every GL object is gone, rebuild from the kept images and CPU meshes. */
  private rebuildAll(): void {
    for (const m of this.meshes.values()) this.uploadMesh(m);
    for (const t of this.texs.values()) t.tex = this.makeTexture(t.img.bmp ?? t.img.el, !!t.img.bmp);
    for (const h of this.handles) {
      this.uploadHandle(h);
      h.brokenTex = null;
      if (h.brokenKey) h.brokenDirty = true;
    }
  }

  meshFor(def: CharacterDef): Mesh {
    const hit = this.meshes.get(def.id);
    if (hit) return hit;
    const [W0, H0] = def.size;
    const [GX, GY] = def.grid;
    const n = (GX + 1) * (GY + 1);
    const rest = new Float32Array(n * 2);
    const uv = new Float32Array(n * 2);
    const wts: Record<string, number>[] = [];
    for (let j = 0; j <= GY; j++) {
      for (let i = 0; i <= GX; i++) {
        const k = j * (GX + 1) + i;
        const x = (i / GX) * W0;
        const y = (j / GY) * H0;
        rest[2 * k] = x;
        rest[2 * k + 1] = y;
        uv[2 * k] = i / GX;
        uv[2 * k + 1] = j / GY;
        wts.push(def.weights(x, y));
      }
    }
    const tri: number[] = [];
    for (let j = 0; j < GY; j++) {
      for (let i = 0; i < GX; i++) {
        const a = j * (GX + 1) + i;
        const b = a + 1;
        const c = a + GX + 1;
        const d = c + 1;
        if (def.part && def.tear) {
          const ids = [a, b, c, d].map((v) => (def.part as (x: number, y: number) => string)(rest[2 * v], rest[2 * v + 1]));
          if (ids.some((v) => v !== ids[0]) && def.tear(((i + 0.5) / GX) * W0, ((j + 0.5) / GY) * H0)) continue;
        }
        tri.push(a, b, c, b, d, c);
      }
    }
    const m: Mesh = { rest, uv, wts, tri: new Uint16Array(tri), uvBuf: null, triBuf: null };
    if (this.gl && !this.lost) this.uploadMesh(m);
    this.meshes.set(def.id, m);
    return m;
  }

  // ----- the public API -----

  add(def: CharacterDef, rect: RigRect): RigHandle {
    const h = new Handle(this, def, rect);
    this.handles.push(h);
    if (this.gl && !this.lost) this.uploadHandle(h);
    void this.attachTextures(h);
    return h;
  }

  release(h: Handle): void {
    const i = this.handles.indexOf(h);
    if (i >= 0) this.handles.splice(i, 1);
    if (this.gl && !this.lost) {
      if (h.posBuf) this.gl.deleteBuffer(h.posBuf);
      if (h.brokenTex) this.gl.deleteTexture(h.brokenTex);
    }
    h.posBuf = null;
    h.brokenTex = null;
  }

  private async attachTextures(h: Handle): Promise<void> {
    const t = h.def.texture;
    const paths: [string, string][] = [['', t.regular], ...Object.entries(t.layers ?? {}), ...Object.entries(t.sprites ?? {}).map(([k, p]) => ['sprite:' + k, p] as [string, string])];
    try {
      const got = await Promise.all(paths.map(([, p]) => loadImage(p)));
      if (h.gone) return;
      paths.forEach(([name, p], i) => {
        if (name.startsWith('sprite:')) h.view.sprites[name.slice(7)] = got[i].el;
        else if (name === '') {
          h.view.image = got[i].el;
          h.base = this.texFor(p, got[i]);
        } else h.layers[name] = this.texFor(p, got[i]);
      });
    } catch {
      // the stage keeps drawing the code-drawn enemy; a later add() tries again after RETRY_MS
    }
  }

  private texFor(path: string, img: Img): Tex {
    let t = this.texs.get(path);
    if (!t) {
      t = { tex: this.gl && !this.lost ? this.makeTexture(img.bmp ?? img.el, !!img.bmp) : null, img };
      this.texs.set(path, t);
    } else if (!t.tex && this.gl && !this.lost) t.tex = this.makeTexture(img.bmp ?? img.el, !!img.bmp);
    return t;
  }

  resize(width: number, height: number, dpr: number): void {
    this.dpr = dpr;
    if (this.glc) {
      this.glc.width = Math.max(2, Math.round(width * dpr));
      this.glc.height = Math.max(2, Math.round(height * dpr));
    }
  }

  async loadAct(act: 0 | 1 | 2 | 3): Promise<void> {
    const paths = MANIFEST.filter((e) => e.act === act).flatMap((e) => e.files.map((f) => f.path));
    await Promise.all(paths.map((p) => loadImage(p).catch(() => null)));
  }

  stats(): RigStats {
    return { ready: this.ready(), painted: this.painted.slice(), samples: this.samples.slice(), draws: this.draws };
  }

  resetStats(): void {
    this.samples = [];
  }

  loseContext(): void {
    this.loseExt?.loseContext();
  }

  restoreContext(): void {
    this.loseExt?.restoreContext();
  }

  /** Rebuild a handle's broken-look texture: the painting with the broken parts' notches erased. */
  private buildBroken(h: Handle): void {
    const gl = this.gl as WebGLRenderingContext;
    h.brokenDirty = false;
    if (h.brokenTex) gl.deleteTexture(h.brokenTex);
    h.brokenTex = null;
    if (!h.brokenKey || !h.base) return;
    const img = h.base.img.el;
    const cv = document.createElement('canvas');
    cv.width = img.naturalWidth;
    cv.height = img.naturalHeight;
    const g = cv.getContext('2d');
    if (!g) return;
    g.drawImage(img, 0, 0);
    g.globalCompositeOperation = 'destination-out';
    g.fillStyle = '#000';
    const sx = cv.width / h.def.size[0];
    const sy = cv.height / h.def.size[1];
    for (const id of h.brokenKey.split(',')) {
      const poly = (h.def.notches ?? {})[id];
      if (!poly) continue;
      g.beginPath();
      poly.forEach(([x, y], i) => (i ? g.lineTo(x * sx, y * sy) : g.moveTo(x * sx, y * sy)));
      g.closePath();
      g.fill();
    }
    h.brokenTex = this.makeTexture(cv);
  }

  mount(anchor: HTMLCanvasElement): HTMLCanvasElement | null {
    if (!this.glc) return null;
    this.glc.className = anchor.className;
    anchor.after(this.glc);
    return this.glc;
  }

  unmount(): void {
    this.glc?.remove();
  }

  frame(ctx: CanvasRenderingContext2D, now: number, overCtx: CanvasRenderingContext2D = ctx): void {
    const t0 = performance.now();
    const gl = this.gl;
    const posed: { h: Handle; P: Pose; t: number }[] = [];
    this.tick++;
    let slot = 0;
    for (const h of this.handles) {
      if (!h.ready()) continue;
      const def = h.def;
      if (h.t0 < 0) {
        h.t0 = now;
        h.last = now;
      }
      // Idle motion is slow, so an idle rig re-poses and re-meshes every second frame, taking turns with the others
      // (the deform is the cost that grows with the rigs; D-033's "30 Hz while idle"). Its effects still draw every frame.
      if (h.lastP && h.mood === 'idle' && ((this.tick + slot++) & 1) === 1) {
        h.fresh = false;
        posed.push({ h, P: h.lastP, t: now - h.t0 });
        continue;
      }
      h.fresh = true;
      const dt = Math.min(0.05, now - h.last);
      const t = now - h.t0;
      h.last = now;
      const target = def.moods[h.mood];
      const ease = 1 - Math.exp(-dt * (def.ease ?? 3));
      for (const k in target) h.live[k] += (target[k] - h.live[k]) * ease;
      h.view.state.broken = h.broken;
      const P = def.pose(h.live, t, dt, h.view.state, h.mood, h.view);
      h.lastP = P;
      h.view.lastP = P;
      const m = h.mesh;
      const v = h.verts;
      for (let k = 0; k < m.wts.length; k++) {
        const r = def.deform(m.rest[2 * k], m.rest[2 * k + 1], m.wts[k], P);
        v[2 * k] = r[0];
        v[2 * k + 1] = r[1];
      }
      posed.push({ h, P, t });
    }
    const place = (c: CanvasRenderingContext2D, h: Handle, P: Pose, fn: () => void): void => {
      const [PX, PY] = h.def.pad;
      const q = h.rect;
      const s = q.w / (h.def.size[0] + 2 * PX);
      const sy = q.h / (h.def.size[1] + 2 * PY);
      const sh = P.shake as number[] | null | undefined;
      c.save();
      c.translate(q.x + (sh ? sh[0] : 0), q.y + (sh ? sh[1] : 0));
      c.scale(s, sy);
      c.translate(PX, PY);
      fn();
      c.restore();
    };
    for (const { h, P, t } of posed) if (h.def.under) place(ctx, h, P, () => (h.def.under as NonNullable<CharacterDef['under']>)(ctx, P, t, h.view));

    const painted: string[] = [];
    if (gl && this.glc && !this.lost && !gl.isContextLost() && posed.length > 0) {
      const glc = this.glc;
      const dpr = this.dpr;
      // Each rig's box in GL pixels. Only these boxes (and where the rigs were last frame) are cleared, never the whole
      // canvas: a full-canvas clear makes SwiftShader (Playwright's Chromium) report "GPU stall due to ReadPixels".
      const boxes = posed.map(({ h, P }) => {
        const q = h.rect;
        const sk = P.shake as number[] | null | undefined;
        const vw = Math.round(q.w * dpr);
        const vh = Math.round(q.h * dpr);
        return [Math.round((q.x + (sk ? sk[0] : 0)) * dpr), glc.height - Math.round((q.y + (sk ? sk[1] : 0)) * dpr) - vh, vw, vh] as [number, number, number, number];
      });
      gl.enable(gl.SCISSOR_TEST);
      gl.clearColor(0, 0, 0, 0);
      for (const b of [...this.lastBoxes, ...boxes]) {
        gl.scissor(b[0], b[1], b[2], b[3]);
        gl.clear(gl.COLOR_BUFFER_BIT);
      }
      this.lastBoxes = boxes;
      for (const [bi, { h, P }] of posed.entries()) {
        if (h.brokenDirty) this.buildBroken(h);
        const [PX, PY] = h.def.pad;
        const [vx, vy, vw, vh] = boxes[bi];
        gl.viewport(vx, vy, vw, vh);
        gl.scissor(vx, vy, vw, vh);
        gl.uniform4f(this.uBox, PX, PY, h.def.size[0] + 2 * PX, h.def.size[1] + 2 * PY);
        gl.uniform1f(this.uFlash, (P.flash as number) || 0);
        gl.bindBuffer(gl.ARRAY_BUFFER, h.mesh.uvBuf);
        gl.enableVertexAttribArray(1);
        gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 0, 0);
        gl.bindBuffer(gl.ARRAY_BUFFER, h.posBuf);
        if (h.fresh) gl.bufferSubData(gl.ARRAY_BUFFER, 0, h.verts);
        gl.enableVertexAttribArray(0);
        gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, h.mesh.triBuf);
        const layerNames = Object.keys(h.layers);
        // A stacked layer (same geometry) fades in over the base; once it is solid the base is skipped (one layer so far).
        const mix = layerNames.length ? Math.min(1, Math.max(0, h.layerMix[layerNames[0]] ?? 0)) : 0;
        gl.bindTexture(gl.TEXTURE_2D, h.brokenTex ?? (h.base as Tex).tex);
        gl.uniform1f(this.uAlpha, 1);
        if (mix < 0.999) gl.drawElements(gl.TRIANGLES, h.mesh.tri.length, gl.UNSIGNED_SHORT, 0);
        if (mix > 0) {
          gl.bindTexture(gl.TEXTURE_2D, h.layers[layerNames[0]].tex);
          gl.uniform1f(this.uAlpha, mix);
          gl.drawElements(gl.TRIANGLES, h.mesh.tri.length, gl.UNSIGNED_SHORT, 0);
        }
        painted.push(h.def.id);
      }
    }
    for (const { h, P, t } of posed) if (h.def.over) place(overCtx, h, P, () => (h.def.over as NonNullable<CharacterDef['over']>)(overCtx, P, t, h.view));

    if (painted.length === 0 && this.glDirty && gl && this.glc && !this.lost && !gl.isContextLost()) {
      gl.enable(gl.SCISSOR_TEST);
      gl.clearColor(0, 0, 0, 0);
      for (const b of this.lastBoxes) {
        gl.scissor(b[0], b[1], b[2], b[3]);
        gl.clear(gl.COLOR_BUFFER_BIT);
      }
      this.lastBoxes = [];
    }
    // An empty WebGL layer is hidden: presenting a canvas that only ever got a clear makes some drivers (SwiftShader, which
    // Playwright's Chromium uses) report a "GPU stall due to ReadPixels" warning.
    if (this.glc) this.glc.style.display = painted.length > 0 ? '' : 'none';
    this.glDirty = painted.length > 0;
    this.painted = painted;
    if (painted.length > 0) {
      this.draws++;
      this.samples.push(performance.now() - t0);
    }
  }
}

let warmed: Promise<void> | null = null;
/**
 * A software WebGL driver (SwiftShader, which headless Chromium and CI use) writes a "GPU stall due to ReadPixels"
 * performance notice to the console for the first few frames any WebGL canvas presents, once per browser process. The
 * notice is harmless and absent on a real GPU, but it would land on the game's console (and fail the console-clean
 * sweep). A throwaway WebGL context in a worker takes those first notices instead, before the first painting is shown;
 * the worker's console is not the page's. Resolves when it is done, or after a second at most.
 */
function warmUpDriver(): Promise<void> {
  if (warmed) return warmed;
  warmed = new Promise<void>((resolve) => {
    if (typeof Worker === 'undefined' || typeof OffscreenCanvas === 'undefined' || typeof Blob === 'undefined') return resolve();
    try {
      const src =
        "onmessage = async () => { try { const c = new OffscreenCanvas(300, 200); const gl = c.getContext('webgl', { alpha: true });" +
        ' for (let i = 0; i < 8; i++) { gl.clearColor(1, 0, 0, 0.5); gl.clear(gl.COLOR_BUFFER_BIT); const b = c.transferToImageBitmap();' +
        " const x = new OffscreenCanvas(10, 10).getContext('2d'); x.drawImage(b, 0, 0); x.getImageData(0, 0, 1, 1); b.close(); await new Promise((r) => setTimeout(r, 25)); } } catch (e) {} postMessage(1); };";
      const url = URL.createObjectURL(new Blob([src], { type: 'text/javascript' }));
      const w = new Worker(url);
      const finish = (): void => {
        w.terminate();
        URL.revokeObjectURL(url);
        resolve();
      };
      w.onmessage = finish;
      w.onerror = finish;
      setTimeout(finish, 1000);
      w.postMessage(1);
    } catch {
      resolve();
    }
  });
  return warmed;
}

export function createRigHub(): RigHub {
  return new Hub();
}

let shared: RigHub | null = null;
/** The one hub the game uses (stages come and go; textures and the GL context stay). */
export function sharedRigHub(): RigHub {
  if (!shared) shared = createRigHub();
  return shared;
}
