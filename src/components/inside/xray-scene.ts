// © 2026 HVNF Studios. All rights reserved. Portfolio sample — do not redistribute.

import {
  BackSide,
  CanvasTexture,
  type BufferGeometry,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  MeshMatcapMaterial,
  PerspectiveCamera,
  Plane,
  PlaneGeometry,
  SRGBColorSpace,
  Scene,
  Texture,
  Vector3,
  WebGLRenderer,
} from "three";
import { DRACOLoader } from "./vendor/draco-loader";
import { BASE_PATH } from "@/lib/base-path";
import { CAMERA_LIVE, LAYER_IDS, smoothstep, type LayerId } from "@/lib/shoe-spec";
import { liveFrame } from "./project";

/*
 * The portfolio's one WebGL scene: Prototype 04 cut open by a moving plane.
 * Loaded by dynamic import from xray-controller.tsx, only on capable desktops
 * and only once #inside is within a viewport, so nothing here is in the first
 * bundle.
 *
 * The trick: five watertight, disjoint layers, each drawn twice from one
 * geometry. The matcap pass shows the outside; a BackSide pass in the layer's
 * flat cap colour shows through wherever the clip plane has sliced the front
 * faces away, so the cut reads as solid. One clip plane, shared by every
 * material from creation (so nothing ever recompiles), gives:
 *   3 programs  matcap+map+clip · basic+backside+clip · basic+map+transparent+clip
 *   12 draws    5 layers × 2 + the baked shadow + the cut-plane frame
 * It renders only while the cut or the tilt is easing toward its target
 * (exponential damping, λ 12), then stops: 0 draws and 0 rAF at rest.
 *
 * Start-up is cut into short tasks with a yield between each (geometry, the
 * renderer, the materials, each texture upload, each of the three programs,
 * then the first frame on the next animation frame), so a load that lands
 * mid-scroll never holds the main thread for one long task.
 */

export type XrayStats = {
  programs: number;
  calls: number;
  frames: number;
  /** From the controller starting the load to the first rendered frame. */
  firstFrameMs: number;
  fetchMs: number;
  decodeMs: number;
  compileMs: number;
};

export type XrayInput = {
  canvas: HTMLCanvasElement;
  /** The sticky stage; the canvas fills it. Read for size and the --shift custom property. */
  stage: HTMLElement;
  pack: ArrayBuffer;
  atlas: TexImageSource;
  matcap: TexImageSource;
  shadow: TexImageSource;
  /** performance.now() when the controller started loading, for firstFrameMs. */
  t0: number;
  fetchMs: number;
  /** Called after every rendered frame with the current cut position. */
  onFrame: (u: number) => void;
  /** The context was lost: the controller falls back to stills. */
  onLost: () => void;
};

export type Xray = {
  /** Ease the cut toward u (0 = whole shoe, CUT_MAX_U = toe). */
  setTarget(u: number): void;
  /** Hover tilt, x and y in -1..1 (0, 0 = rest). */
  setTilt(x: number, y: number): void;
  /** A scene point to stage pixels, through the live camera. */
  project(p: readonly [number, number, number]): readonly [number, number];
  stats: XrayStats;
  dispose(): void;
};

type PackHeader = {
  v: number;
  copyright?: string;
  layers: { name: LayerId; offset: number; length: number }[];
};

/** Flat section colours, the --cap-* tokens: the plate's edge is the volt one. */
const CAP: Record<LayerId, number> = {
  outsole: 0x2b2f2a,
  carrier: 0x6f746b,
  plate: 0xccff00,
  foam: 0xe9e9e2,
  upper: 0xa2a79c,
};

const LAMBDA = 12;
const YAW = 0.06;
const PITCH = 0.03;
/** The cut-plane frame sits a hair in front of the cut so it never z-fights the caps. */
const FRAME_NUDGE = 0.002;
/** How close the camera moves in once it follows the cut (1 = CAMERA_LIVE). */
const FOLLOW_ZOOM = 0.8;

/** Hand the main thread back: scheduler.yield() where there is one, else a macrotask. */
const yieldTask = (): Promise<void> => {
  const scheduler = (globalThis as { scheduler?: { yield?: () => Promise<void> } }).scheduler;
  return scheduler?.yield ? scheduler.yield() : new Promise((resolve) => setTimeout(resolve, 0));
};

const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

function texture(source: TexImageSource, srgb: boolean) {
  const t = new Texture(source as HTMLImageElement);
  t.flipY = false; // UVs follow glTF's convention (Blender's exporter)
  if (srgb) t.colorSpace = SRGBColorSpace;
  t.needsUpdate = true;
  return t;
}

/** The volt outline of the cutting plane: a 3 px border on a transparent square, no fill. */
function frameTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const g = c.getContext("2d");
  if (g) {
    g.strokeStyle = "#ccff00";
    g.lineWidth = 3;
    g.strokeRect(1.5, 1.5, 253, 253);
  }
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
}

async function decodePack(pack: ArrayBuffer): Promise<Map<LayerId, BufferGeometry>> {
  const view = new DataView(pack);
  const headerLen = view.getUint32(0, true);
  const header = JSON.parse(new TextDecoder().decode(new Uint8Array(pack, 4, headerLen))) as PackHeader;
  const base = 4 + headerLen;
  // The glTF-variant decoder (63 KB gz wasm), never the default full one (88 KB gz).
  const draco = new DRACOLoader()
    .setDecoderPath({ js: `${BASE_PATH}/draco/draco_wasm_wrapper.js`, wasm: `${BASE_PATH}/draco/draco_decoder.wasm` })
    .setWorkerLimit(1);
  try {
    const geometries = await Promise.all(
      header.layers.map(
        (layer) =>
          new Promise<[LayerId, BufferGeometry]>((resolve, reject) =>
            draco.parse(
              pack.slice(base + layer.offset, base + layer.offset + layer.length),
              (geometry) => resolve([layer.name, geometry]),
              reject,
            ),
          ),
      ),
    );
    return new Map(geometries);
  } finally {
    draco.dispose();
  }
}

export async function createXray(input: XrayInput): Promise<Xray> {
  const { canvas, stage, onFrame, onLost } = input;

  /*
   * Between start-up steps: yield, and if the page is scrolling, wait for a 250 ms pause
   * (longer than the gap between wheel ticks or momentum frames), so each heavy step (the
   * context, a program link, a texture upload) lands while the reader has stopped, never on
   * a wheel burst. The 2048² atlas upload is one atomic 50–70 ms task on a real GPU
   * (measured; uploading it in four bands only moved the stall to a sync point).
   */
  let lastScroll = 0;
  const onScroll = () => {
    lastScroll = performance.now();
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  const calm = async () => {
    await yieldTask();
    while (performance.now() - lastScroll < 250) await new Promise((resolve) => setTimeout(resolve, 60));
  };

  const tDecode = performance.now();
  const geometries = await decodePack(input.pack);
  const decodeMs = performance.now() - tDecode;
  await calm();

  // Created inside the caller's try/catch: no throwaway context to probe for WebGL.
  const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: false, stencil: false, powerPreference: "default" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.localClippingEnabled = true;
  renderer.debug.checkShaderErrors = process.env.NODE_ENV !== "production";
  renderer.setClearColor(0x0b0c0a, 1);

  const scene = new Scene();
  const camera = new PerspectiveCamera(CAMERA_LIVE.fov, CAMERA_LIVE.aspect, 0.1, 30);
  const home0 = new Vector3(...CAMERA_LIVE.target);
  const target = home0.clone();
  const home = new Vector3(...CAMERA_LIVE.pos).sub(home0); // camera offset from its target
  const offset = new Vector3();
  const axis = new Vector3();
  const yUp = new Vector3(0, 1, 0);
  let dolly = 1;
  let stageW = 1;
  let stageH = 1;

  // One plane, one array, on every material from creation: its length never changes, so nothing recompiles.
  // The plane keeps x >= -constant; 1.6 is past the heel, so it cuts nothing.
  const cut = new Plane(new Vector3(1, 0, 0), 1.6);
  const clip = [cut];

  const atlas = texture(input.atlas, true);
  const matcap = texture(input.matcap, true);
  const shadowMap = texture(input.shadow, false);
  const frameMap = frameTexture();

  await calm();

  /*
   * The skin's exposure. MeshMatcapMaterial multiplies atlas × matcap, and the baked knit
   * albedo (with its AO) times the matcap came out near-black: about #14 on screen against
   * the hero still's mid-grey upper, with every facet showing. A plain gain can't fix that
   * without clipping the volt stripes and the white foam. So the skin takes a square root in
   * linear light (darks come up a lot, lights barely move, facets flatten), then each layer
   * mixes toward the hero still's grey by its own amount: the knit upper most, the dark
   * rubber a little, the white foam and the plate not at all. One uniform, the same shader
   * for all five skins, so they still share one program (3 in all). The flat cap colours are
   * untouched, so the section still reads true.
   */
  const LIFT: Record<LayerId, number> = { upper: 0.3, outsole: 0.12, carrier: 0.08, foam: 0, plate: 0 };
  const liftFor = (amount: number) => (shader: { fragmentShader: string; uniforms: Record<string, { value: unknown }> }) => {
    shader.uniforms.uLift = { value: amount };
    shader.fragmentShader = shader.fragmentShader
      .replace("void main() {", "uniform float uLift;\nvoid main() {")
      .replace(
        "vec3 outgoingLight = diffuseColor.rgb * matcapColor.rgb;",
        "vec3 outgoingLight = mix( sqrt( max( diffuseColor.rgb * matcapColor.rgb, vec3( 0.0 ) ) ), vec3( 0.33 ), uLift );",
      );
  };
  const materials: (MeshMatcapMaterial | MeshBasicMaterial)[] = [];
  for (const id of LAYER_IDS) {
    const geometry = geometries.get(id);
    if (!geometry) continue;
    const skin = new MeshMatcapMaterial({ map: atlas, matcap, clippingPlanes: clip });
    skin.onBeforeCompile = liftFor(LIFT[id]);
    skin.customProgramCacheKey = () => "apex-skin-lift";
    const cap = new MeshBasicMaterial({ color: CAP[id], side: BackSide, clippingPlanes: clip });
    materials.push(skin, cap);
    scene.add(new Mesh(geometry, skin), new Mesh(geometry, cap));
  }

  // The baked contact shadow. Clipped too, so the heel's shadow goes when the heel does.
  const shadowGeometry = new PlaneGeometry(3.4, 1.15);
  const shadowMaterial = new MeshBasicMaterial({ map: shadowMap, transparent: true, depthWrite: false, clippingPlanes: clip });
  const shadow = new Mesh(shadowGeometry, shadowMaterial);
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = -0.028;
  scene.add(shadow);

  // The cutting plane's volt frame. FrontSide (a DoubleSide quad would be a 4th program), facing the heel-side camera.
  const frameGeometry = new PlaneGeometry(1.15, 1.25);
  const frameMaterial = new MeshBasicMaterial({ map: frameMap, transparent: true, depthWrite: false, clippingPlanes: clip });
  const frame = new Mesh(frameGeometry, frameMaterial);
  frame.rotation.y = -Math.PI / 2;
  frame.position.set(0, 0.5, 0);
  frame.visible = false;
  scene.add(frame);
  materials.push(shadowMaterial, frameMaterial);

  const stats: XrayStats = {
    programs: 0,
    calls: 0,
    frames: 0,
    firstFrameMs: 0,
    fetchMs: Math.round(input.fetchMs),
    decodeMs: Math.round(decodeMs),
    compileMs: 0,
  };
  const w = window as Window & { __apex?: Record<string, unknown> };
  w.__apex = { ...w.__apex, xray: stats };

  /* -------------------------------------------------------------- camera --- */

  let cur = 0;
  let goal = 0;
  const tilt = { x: 0, y: 0 };
  const tiltGoal = { x: 0, y: 0 };

  /*
   * The camera follows the blade. At the whole shoe it is exactly CAMERA_LIVE, the camera the
   * poster was rendered from; as the cut moves on, its target eases toward the middle of what is
   * left of the shoe and it moves in a little, so the toe section is not a small thing at the far
   * edge. Mild on purpose: the stack still visibly thins toward the toe. Pins project through
   * this same camera, so they stay on the cut face.
   */
  function placeCamera(u: number) {
    const xc = -1.5 + 3 * u;
    target.copy(home0);
    target.x = MathUtils.lerp(home0.x, (xc + 1.5) / 2, smoothstep(0.1, 0.5, u));
    offset.copy(home).multiplyScalar(dolly * MathUtils.lerp(1, FOLLOW_ZOOM, smoothstep(0.25, 0.86, u)));
    offset.applyAxisAngle(yUp, tilt.x * YAW);
    axis.crossVectors(offset, yUp).normalize();
    offset.applyAxisAngle(axis, tilt.y * PITCH);
    camera.position.copy(target).add(offset);
    camera.lookAt(target);
  }

  function resize() {
    const width = (stageW = Math.max(1, stage.clientWidth));
    const height = (stageH = Math.max(1, stage.clientHeight));
    renderer.setSize(width, height, false);
    const aspect = width / height;
    const framing = liveFrame(CAMERA_LIVE.fov, aspect);
    dolly = framing.dolly;
    camera.fov = framing.fov;
    camera.aspect = aspect;
    // --shift moves the shoe right by a share of the stage, leaving the left for the callouts.
    // filmOffset slides the frustum sideways without turning the camera; the poster gets the same translate.
    const shift = parseFloat(getComputedStyle(stage).getPropertyValue("--shift")) || 0;
    const tanHalf = Math.tan(MathUtils.degToRad(camera.fov / 2));
    camera.filmOffset = -shift * 2 * tanHalf * aspect * camera.getFilmWidth();
    camera.updateProjectionMatrix();
    placeCamera(cur);
  }

  function applyCut(u: number) {
    if (u < 0.01) {
      cut.constant = 1.6;
      frame.visible = false;
    } else {
      const xc = -1.5 + 3 * u;
      cut.constant = -xc;
      frame.visible = true;
      frame.position.x = xc + FRAME_NUDGE;
    }
  }

  /* ---------------------------------------------------------------- loop --- */

  let raf = 0;
  let last = 0;
  let disposed = false;

  function draw() {
    renderer.render(scene, camera);
    stats.calls = renderer.info.render.calls;
    stats.programs = renderer.info.programs?.length ?? 0;
    stats.frames++;
  }

  function step(now: number) {
    raf = 0;
    if (disposed) return;
    const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
    last = now;
    const k = 1 - Math.exp(-LAMBDA * dt);
    cur += (goal - cur) * k;
    tilt.x += (tiltGoal.x - tilt.x) * k;
    tilt.y += (tiltGoal.y - tilt.y) * k;
    const settled =
      Math.abs(goal - cur) < 5e-4 && Math.abs(tiltGoal.x - tilt.x) < 5e-4 && Math.abs(tiltGoal.y - tilt.y) < 5e-4;
    if (settled) {
      cur = goal;
      tilt.x = tiltGoal.x;
      tilt.y = tiltGoal.y;
    }
    applyCut(cur);
    placeCamera(cur);
    draw();
    onFrame(cur);
    // Snapped and drawn once more: stop. Nothing runs until the next input.
    if (!settled) raf = requestAnimationFrame(step);
  }

  function request() {
    if (raf || disposed) return;
    last = performance.now();
    raf = requestAnimationFrame(step);
  }

  /* ---------------------------------------------------------- first frame --- */

  resize();
  applyCut(cur);

  // Upload each texture in its own task.
  for (const t of [atlas, matcap, shadowMap, frameMap]) {
    await calm();
    renderer.initTexture(t);
  }

  // Compile the three programs one at a time (one stand-in mesh per program, sharing the real
  // materials, so the cache hits on the first draw); without KHR_parallel_shader_compile each
  // link is synchronous, so one program per task keeps every task short.
  const tCompile = performance.now();
  const firstLayer = scene.children.find((o): o is Mesh => o instanceof Mesh && o.material instanceof MeshMatcapMaterial);
  const programs: Mesh[] = firstLayer
    ? [
        new Mesh(firstLayer.geometry, firstLayer.material),
        new Mesh(firstLayer.geometry, materials[1]),
        new Mesh(shadowGeometry, shadowMaterial),
      ]
    : [];
  for (const mesh of programs) {
    await calm();
    const one = new Scene();
    one.add(mesh);
    await renderer.compileAsync(one, camera);
  }
  await calm();
  await renderer.compileAsync(scene, camera); // anything left: every program is cached by now
  stats.compileMs = Math.round(performance.now() - tCompile);

  // The first visible frame in its own animation frame.
  await calm();
  await nextFrame();
  window.removeEventListener("scroll", onScroll);
  draw();
  onFrame(cur);
  stats.firstFrameMs = Math.round(performance.now() - input.t0);

  const observer = new ResizeObserver(() => {
    resize();
    // Render once at the new size, even at rest.
    if (!raf) {
      draw();
      onFrame(cur);
    }
  });
  observer.observe(stage);

  const lost = (event: Event) => {
    event.preventDefault();
    onLost();
  };
  canvas.addEventListener("webglcontextlost", lost);

  const projected = new Vector3();

  return {
    setTarget(u) {
      goal = u;
      request();
    },
    setTilt(x, y) {
      tiltGoal.x = MathUtils.clamp(x, -1, 1);
      tiltGoal.y = MathUtils.clamp(y, -1, 1);
      request();
    },
    project(p) {
      projected.set(p[0], p[1], p[2]).project(camera);
      return [((projected.x + 1) / 2) * stageW, ((1 - projected.y) / 2) * stageH];
    },
    stats,
    dispose() {
      disposed = true;
      if (raf) cancelAnimationFrame(raf);
      observer.disconnect();
      canvas.removeEventListener("webglcontextlost", lost);
      geometries.forEach((g) => g.dispose());
      shadowGeometry.dispose();
      frameGeometry.dispose();
      materials.forEach((m) => m.dispose());
      [atlas, matcap, shadowMap, frameMap].forEach((t) => t.dispose());
      renderer.dispose();
      renderer.forceContextLoss();
    },
  };
}
