// Reusable mesh rig: one painting on a WebGL grid, bent by a character's deform function.
// A character supplies: size [W, H], grid [GX, GY], weights(x, y), deform(x, y, w, P),
// pad [px, py] (margin around the painting), part(x, y) -> id and tear(x, y) -> bool (drop triangles that
// straddle two parts where tear() says the parts are separate objects, such as an arm hanging beside a leg), moods {name: targets}, pose(live, t, dt, state) -> P, optional under/over(ctx, P, t, api) for code effects, and optional anchors {id: [x, y, r]} (image pixels)
// for breakable parts and effect points, read back with api.anchor(id). Project copy: edit only with a decision.
window.Rig = {
  smooth(a, b, v) { const t = Math.min(1, Math.max(0, (v - a) / (b - a))); return t * t * (3 - 2 * t); },
  band(x, x0, x1, soft) { return Rig.smooth(x0 - soft, x0 + soft, x) * Rig.smooth(x1 + soft, x1 - soft, x); },
  rad(d) { return d * Math.PI / 180; },
  rot(x, y, px, py, a, w) {
    if (!w || !a) return [x, y];
    const c = Math.cos(a), s = Math.sin(a), dx = x - px, dy = y - py;
    return [x + w * (px + dx * c - dy * s - x), y + w * (py + dx * s + dy * c - y)];
  },

  mount(stage, ch, imgSrc) {
    const [W, H] = ch.size, [GX, GY] = ch.grid, [PX, PY] = ch.pad || [0, 0], WW = W + 2 * PX, WH = H + 2 * PY;
    const mk = () => { const c = document.createElement("canvas"); stage.appendChild(c); return c; };
    const under = mk(), glc = mk(), over = mk();
    const gl = glc.getContext("webgl", { premultipliedAlpha: true, alpha: true, antialias: true });
    const uctx = under.getContext("2d"), octx = over.getContext("2d");
    const api = {
      mood: Object.keys(ch.moods)[0], live: {}, state: {}, frozen: false, showMesh: false, flash: 0,
      setMood(m) { api.mood = m; api.frozen = false; ch.onMood && ch.onMood(m, api); },
      point(x, y, P) { return ch.deform(x, y, ch.weights(x, y), P); },
      // Where an image-pixel point is now, in CSS pixels relative to the stage (uses the last drawn pose).
      anchorAt(x, y) {
        const P = api.lastP; if (!P) return null;
        const [dx, dy] = ch.deform(x, y, ch.weights(x, y), P), r = stage.getBoundingClientRect();
        return [(dx + PX) / WW * r.width, (dy + PY) / WH * r.height];
      },
      // A named anchor from ch.anchors {id: [x, y, r]}: [cssX, cssY, cssRadius] or null.
      anchor(id) {
        const a = ch.anchors && ch.anchors[id]; if (!a) return null;
        const p = api.anchorAt(a[0], a[1]); if (!p) return null;
        return [p[0], p[1], a[2] / WW * stage.getBoundingClientRect().width];
      },
    };
    Object.assign(api.live, ch.moods[api.mood]);
    let rest, verts, wts, idx, posBuf, uMesh, uFlash;

    function size() {
      const dpr = Math.min(2, window.devicePixelRatio || 1), r = stage.getBoundingClientRect();
      for (const c of [glc, under, over]) { c.width = Math.round(r.width * dpr); c.height = Math.round(r.height * dpr); }
      gl.viewport(0, 0, glc.width, glc.height);
    }
    function sh(type, src) { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; }
    function setup(img) {
      const p = gl.createProgram();
      gl.attachShader(p, sh(gl.VERTEX_SHADER, `attribute vec2 a_pos; attribute vec2 a_uv; varying vec2 v_uv;
        void main(){ v_uv=a_uv; vec2 c=(a_pos+vec2(${PX}.0,${PY}.0))/vec2(${WW}.0,${WH}.0)*2.0-1.0; gl_Position=vec4(c.x,-c.y,0.0,1.0); }`));
      gl.attachShader(p, sh(gl.FRAGMENT_SHADER, `precision mediump float; varying vec2 v_uv; uniform sampler2D t;
        uniform float u_mesh; uniform float u_flash;
        void main(){ vec4 c=texture2D(t,v_uv); c.rgb=mix(c.rgb,vec3(c.a),u_flash);
          gl_FragColor = u_mesh>0.5 ? vec4(0.95,0.8,0.3,1.0) : c; }`));
      gl.linkProgram(p); gl.useProgram(p);
      const tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
      for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v);
      const n = (GX + 1) * (GY + 1); rest = new Float32Array(n * 2); verts = new Float32Array(n * 2); const uv = new Float32Array(n * 2); wts = [];
      for (let j = 0; j <= GY; j++) for (let i = 0; i <= GX; i++) {
        const k = j * (GX + 1) + i, x = i / GX * W, y = j / GY * H;
        rest[2 * k] = x; rest[2 * k + 1] = y; uv[2 * k] = i / GX; uv[2 * k + 1] = j / GY; wts.push(ch.weights(x, y));
      }
      const tri = [], lines = [];
      for (let j = 0; j < GY; j++) for (let i = 0; i < GX; i++) {
        const a = j * (GX + 1) + i, b = a + 1, c = a + GX + 1, d = c + 1; lines.push(a, b, a, c);
        if (ch.part && ch.tear) {
          const ids = [a, b, c, d].map(v => ch.part(rest[2 * v], rest[2 * v + 1]));
          const cx = (i + 0.5) / GX * W, cy = (j + 0.5) / GY * H;
          if (ids.some(v => v !== ids[0]) && ch.tear(cx, cy)) continue;
        }
        tri.push(a, b, c, b, d, c);
      }
      idx = { tri: new Uint16Array(tri), lines: new Uint16Array(lines) };
      idx.triBuf = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, idx.triBuf); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idx.tri, gl.STATIC_DRAW);
      idx.lineBuf = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, idx.lineBuf); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idx.lines, gl.STATIC_DRAW);
      const uvBuf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, uvBuf); gl.bufferData(gl.ARRAY_BUFFER, uv, gl.STATIC_DRAW);
      const aUv = gl.getAttribLocation(p, "a_uv"); gl.enableVertexAttribArray(aUv); gl.vertexAttribPointer(aUv, 2, gl.FLOAT, false, 0, 0);
      posBuf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, posBuf); gl.bufferData(gl.ARRAY_BUFFER, verts, gl.DYNAMIC_DRAW);
      const aPos = gl.getAttribLocation(p, "a_pos"); gl.enableVertexAttribArray(aPos); gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
      uMesh = gl.getUniformLocation(p, "u_mesh"); uFlash = gl.getUniformLocation(p, "u_flash");
      gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    }

    function step(dt, t) {
      const target = ch.moods[api.mood], ease = 1 - Math.exp(-dt * (ch.ease || 3));
      for (const k in target) api.live[k] += (target[k] - api.live[k]) * ease;
      return ch.pose(api.live, t, dt, api.state, api);
    }
    function draw(P, t) {
      api.lastP = P;
      for (let k = 0; k < wts.length; k++) {
        const [x, y] = ch.deform(rest[2 * k], rest[2 * k + 1], wts[k], P); verts[2 * k] = x; verts[2 * k + 1] = y;
      }
      gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
      gl.bindBuffer(gl.ARRAY_BUFFER, posBuf); gl.bufferSubData(gl.ARRAY_BUFFER, 0, verts);
      gl.uniform1f(uFlash, P.flash || 0); gl.uniform1f(uMesh, 0);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, idx.triBuf); gl.drawElements(gl.TRIANGLES, idx.tri.length, gl.UNSIGNED_SHORT, 0);
      if (api.showMesh) { gl.uniform1f(uMesh, 1); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, idx.lineBuf); gl.drawElements(gl.LINES, idx.lines.length, gl.UNSIGNED_SHORT, 0); }
      const sx = under.width / WW, sy = under.height / WH;
      for (const [c, f] of [[uctx, ch.under], [octx, ch.over]]) {
        c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, under.width, under.height); c.setTransform(sx, 0, 0, sy, PX * sx, PY * sy);
        if (f) { c.save(); f(c, P, t, api); c.restore(); }
      }
      // Screen shake moves the whole stage.
      stage.style.transform = P.shake ? `translate(${P.shake[0]}px, ${P.shake[1]}px)` : "";
    }

    let last = performance.now(), t0 = last;
    api.reset = m => { api.mood = m; api.live = { ...ch.moods[m] }; api.state = {}; ch.onMood && ch.onMood(m, api); };
    api.seq = m => { api.frozen = true; api.reset(m); let t = 0; return { next(dt) { t += dt; draw(step(dt, t), t); } }; };
    const img = new Image();
    img.onload = () => {
      size(); setup(img); api.ready = true; window.addEventListener("resize", size);
      requestAnimationFrame(function loop(now) {
        const dt = Math.min(0.05, (now - last) / 1000); last = now;
        if (!api.frozen) { const t = (now - t0) / 1000; draw(step(dt, t), t); }
        requestAnimationFrame(loop);
      });
    };
    img.src = imgSrc;
    return api;
  },
};
