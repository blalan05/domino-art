<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {
  DOMINO_COL_SPACING_M,
  DOMINO_HEIGHT_M,
  DOMINO_ROW_SPACING_M,
  DOMINO_THICKNESS_M,
  DOMINO_WIDTH_M,
  dominoBalanceAngleRad,
  dominoChainViable,
  dominoTrainAngleBehind,
  dominoTriggerAngleRad,
  type Color,
  type FieldProjectData,
  type ToppleDirection,
} from '@domino-art/shared';

const props = defineProps<{
  projectData: FieldProjectData;
  colors: Color[];
}>();

/**
 * Real-world trigger patterns (see Domino-Tim building techniques):
 * - 'serpentine' (Toppling Line): the chain topples through a line, then physical
 *   U-turn connector dominos (placed on an arc, each yawed progressively) carry it
 *   into the next line in the opposite direction. One push, one line at a time.
 * - 'fieldStarter': a starter wedge fires every line near-simultaneously, producing
 *   a diagonal cascade.
 */
type TriggerPattern = 'serpentine' | 'fieldStarter';

const container = ref<HTMLDivElement | null>(null);
const slowMo = ref(false);
const status = ref('Ready');
const triggerPattern = ref<TriggerPattern>('serpentine');

interface DominoSlot {
  /** Grid cell, or -1/-1 for U-turn connector dominos. */
  row: number;
  col: number;
  baseX: number;
  baseZ: number;
  /** Yaw of the fall direction in the XZ plane (rotation about Y). */
  heading: number;
  /** Tilt about the bottom pivot edge, 0 = standing. */
  angle: number;
}

/**
 * A chain is a run of dominos toppling in sequence, simulated as a van Leeuwen
 * "train": the head domino is the only free variable; every domino behind it
 * leans on its neighbor with an angle given by the train recursion.
 */
interface Chain {
  indices: number[];
  /** Position of the current head within `indices`; -1 = not yet triggered. */
  headPos: number;
  headAngle: number;
  headOmega: number;
  done: boolean;
  stalled: boolean;
  /** Next chain in topple order (gap jump or U-turn handoff). */
  nextChain: number | null;
  /** Head tilt at which the last domino strikes the next chain's first domino. */
  linkAngle: number;
}

interface LineInfo {
  /** Actual grid line number (row or column index). */
  line: number;
  /** Chain indices in topple order for this line. */
  chainIdxs: number[];
}

let renderer: THREE.WebGLRenderer | null = null;
let scene: THREE.Scene | null = null;
let camera: THREE.PerspectiveCamera | null = null;
let controls: OrbitControls | null = null;
let instancedMesh: THREE.InstancedMesh | null = null;
let animationId = 0;
let resizeObserver: ResizeObserver | null = null;
let dominoSlots: DominoSlot[] = [];
let chains: Chain[] = [];
let lines: LineInfo[] = [];
/** Chains scheduled to start once the sim clock reaches their time (field starter). */
let pendingStarts: { chainIdx: number; time: number }[] = [];
let simClock = 0;
let toppleDir: ToppleDirection = 'horizontal';

const TRIGGER_ANGLE = dominoTriggerAngleRad();
const BALANCE_ANGLE = dominoBalanceAngleRad();
const GRAVITY = 9.81;
const H = DOMINO_HEIGHT_M;
const D = DOMINO_THICKNESS_M;
// Rigid box pivoting on its bottom edge: I = m(h² + d²)/3,
// torque = mg/2 · (h·sinθ − d·cosθ)  →  α = 1.5g(h·sinθ − d·cosθ)/(h² + d²)
const ALPHA_FACTOR = (1.5 * GRAVITY) / (H * H + D * D);
/** Sustained push (rad/s²) from the leaning train behind the head (capped depth). */
const TRAIN_PUSH = 100;
const TRAIN_PUSH_DEPTH = 4;
const COLLISION_TRANSFER = 0.9;
const INITIAL_OMEGA = 5;
/** Trailing dominos updated per frame; beyond this they sit at the stacking angle. */
const TRAIN_DEPTH = 12;
/** Gaps wider than this fraction of domino height cannot be struck across. */
const MAX_REACH_FRACTION = 0.98;
/**
 * Center-to-center pitch along a curve. Builders space curves tighter than
 * straights (Hevesh5 / techsavvo guidance), and the pitch-to-radius ratio must
 * keep the yaw change per domino under the ~30° reliability limit.
 */
const CURVE_PITCH_M = 0.01;
/**
 * Turn radius for U-turn arcs. 26 mm (~one domino width) at 10 mm pitch gives
 * ~22° of yaw per domino — within the "at least 4 dominos per 90°" rule.
 */
const TURN_RADIUS_M = 0.026;
/** Edge toppling-line speed used to stagger lines in field-starter mode (m/s). */
const EDGE_WAVE_SPEED = 1.0;
const CONNECTOR_COLOR = '#9ca3af';

const tempMatrix = new THREE.Matrix4();
const stepMatrix = new THREE.Matrix4();
const tempQuaternion = new THREE.Quaternion();
const tempEuler = new THREE.Euler(0, 0, 0, 'XYZ');

onMounted(() => {
  if (!container.value) return;
  initScene(container.value);
  buildDominoes();
  animate();
  resizeObserver = new ResizeObserver(() => resizeScene());
  resizeObserver.observe(container.value);
});

watch(
  () => props.projectData,
  () => {
    buildDominoes();
  },
  { deep: true },
);

// Serpentine reverses alternate lines and adds connector dominos; rebuild needed.
watch(triggerPattern, () => {
  buildDominoes();
});

onBeforeUnmount(() => {
  cancelAnimationFrame(animationId);
  resizeObserver?.disconnect();
  controls?.dispose();
  disposeDominoMesh();
  renderer?.dispose();
});

function initScene(el: HTMLDivElement) {
  const width = el.clientWidth;
  const height = el.clientHeight;
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  el.appendChild(renderer.domElement);

  scene = new THREE.Scene();
  scene.background = new THREE.Color('#111827');

  camera = new THREE.PerspectiveCamera(55, width / height, 0.001, 20);
  camera.position.set(0.35, 0.45, 0.55);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.target.set(0, DOMINO_HEIGHT_M * 0.35, 0);

  const light = new THREE.DirectionalLight(0xffffff, 1.2);
  light.position.set(2, 4, 3);
  scene.add(light);
  scene.add(new THREE.AmbientLight(0xffffff, 0.35));

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(6, 6),
    new THREE.MeshStandardMaterial({ color: '#1f2937' }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.0005;
  scene.add(ground);
}

function resizeScene() {
  if (!container.value || !renderer || !camera) return;
  const width = container.value.clientWidth;
  const height = container.value.clientHeight;
  if (width === 0 || height === 0) return;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
}

function disposeDominoMesh() {
  if (!instancedMesh) return;
  scene?.remove(instancedMesh);
  instancedMesh.geometry.dispose();
  (instancedMesh.material as THREE.Material).dispose();
  instancedMesh = null;
}

interface Vec2 {
  x: number;
  z: number;
}

/** Unit XZ direction vector for a heading (rotation about Y applied to +X). */
function headingVector(heading: number): Vec2 {
  return { x: Math.cos(heading), z: -Math.sin(heading) };
}

/** Perpendicular of the heading: s=+1 right side, s=-1 left side. */
function sideVector(heading: number, s: number): Vec2 {
  return { x: s * Math.sin(heading), z: s * Math.cos(heading) };
}

function vAdd(a: Vec2, b: Vec2, k = 1): Vec2 {
  return { x: a.x + k * b.x, z: a.z + k * b.z };
}
function vSub(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x - b.x, z: a.z - b.z };
}
function vDot(a: Vec2, b: Vec2): number {
  return a.x * b.x + a.z * b.z;
}
function vLen(a: Vec2): number {
  return Math.hypot(a.x, a.z);
}
function vUnit(a: Vec2): Vec2 {
  const n = vLen(a);
  return { x: a.x / n, z: a.z / n };
}

/** Heading at a point on a turning circle (center C, chirality c: +1 cw, -1 ccw). */
function headingOnCircle(center: Vec2, point: Vec2, c: number): number {
  const u = vUnit(vSub(center, point));
  return c > 0 ? Math.atan2(u.x, u.z) : Math.atan2(-u.x, -u.z);
}

/** Append arc samples (~1 mm resolution) from Ps to Pe around `center`. */
function sampleArc(center: Vec2, c: number, Ps: Vec2, Pe: Vec2, out: Vec2[]) {
  const h1 = headingOnCircle(center, Ps, c);
  const h2 = headingOnCircle(center, Pe, c);
  let sweep = h2 - h1;
  if (c > 0) while (sweep > 0) sweep -= 2 * Math.PI;
  else while (sweep < 0) sweep += 2 * Math.PI;
  const steps = Math.max(2, Math.ceil((Math.abs(sweep) * TURN_RADIUS_M) / 0.001));
  for (let i = 1; i <= steps; i += 1) {
    const h = h1 + (sweep * i) / steps;
    out.push(vAdd(center, sideVector(h, c), -TURN_RADIUS_M));
  }
}

function sampleStraight(a: Vec2, b: Vec2, out: Vec2[]) {
  const steps = Math.max(2, Math.ceil(vLen(vSub(b, a)) / 0.001));
  for (let i = 1; i <= steps; i += 1) {
    out.push(vAdd(a, vSub(b, a), i / steps));
  }
}

/**
 * Plan the U-turn path from the end of one line (pose A, heading hA) to the
 * start of the next (pose B, heading hB ≈ hA + 180°), using bounded-curvature
 * arcs of TURN_RADIUS_M — the geometry real builders use:
 * - Adjacent lines sit closer than 2R apart, so a smooth 180° turn is impossible
 *   in the gap; the line loops outward in a teardrop (arc-arc-arc).
 * - Distant lines (≥2R apart) connect with two arcs and a straight (arc-straight-arc).
 * - Lines of different lengths get a straight lead-in/lead-out so the turn
 *   itself stays at the field edge.
 */
function planUturnPath(A: Vec2, hA: number, B: Vec2, hB: number): Vec2[] {
  const R = TURN_RADIUS_M;
  const dirA = headingVector(hA);
  const points: Vec2[] = [{ ...A }];

  let from = { ...A };
  let to = { ...B };
  let tail: [Vec2, Vec2] | null = null;

  const lateral0 = Math.abs(vDot(vSub(B, A), sideVector(hA, 1)));
  if (lateral0 < 2 * R) {
    // Keep the teardrop at the field edge; bridge length differences with straights.
    const overshoot = -vDot(vSub(B, A), dirA);
    if (overshoot > 0.001) {
      to = vAdd(B, dirA, overshoot);
      tail = [to, B];
    } else if (overshoot < -0.001) {
      const extended = vAdd(A, dirA, -overshoot);
      sampleStraight(A, extended, points);
      from = extended;
    }
  }

  const s = vDot(vSub(to, from), sideVector(hA, 1)) >= 0 ? 1 : -1;
  const lateral = Math.abs(vDot(vSub(to, from), sideVector(hA, 1)));

  if (lateral >= 2 * R) {
    // Arc - straight - arc.
    const c1 = vAdd(from, sideVector(hA, s), R);
    const c3 = vAdd(to, sideVector(hB, s), R);
    const u = vUnit(vSub(c3, c1));
    const hStraight = Math.atan2(-u.z, u.x);
    const p1 = vAdd(c1, sideVector(hStraight, s), -R);
    const p2 = vAdd(c3, sideVector(hStraight, s), -R);
    sampleArc(c1, s, from, p1, points);
    sampleStraight(p1, p2, points);
    sampleArc(c3, s, p2, to, points);
  } else {
    // Teardrop: outer arcs away from the next line, middle arc bulging outward.
    const c1 = vAdd(from, sideVector(hA, -s), R);
    const c3 = vAdd(to, sideVector(hB, -s), R);
    const d = vSub(c3, c1);
    const mid = vAdd(c1, d, 0.5);
    const offset = Math.sqrt(Math.max(0, 4 * R * R - (vLen(d) / 2) ** 2));
    let perp = vUnit({ x: -d.z, z: d.x });
    if (vDot(perp, dirA) < 0) perp = { x: -perp.x, z: -perp.z };
    const c2 = vAdd(mid, perp, offset);
    const t1 = vAdd(c1, vSub(c2, c1), 0.5);
    const t2 = vAdd(c2, vSub(c3, c2), 0.5);
    sampleArc(c1, -s, from, t1, points);
    sampleArc(c2, s, t1, t2, points);
    sampleArc(c3, -s, t2, to, points);
  }

  if (tail) sampleStraight(tail[0], tail[1], points);
  return points;
}

/**
 * Place U-turn connector dominos along the planned path, evenly spaced at
 * ~CURVE_PITCH_M, each yawed to the local tangent. This is the real
 * construction: a 180° turn needs at least 8 angled dominos (≥4 per 90°),
 * each turned ≤30° relative to the previous one.
 */
function buildUturnSlots(
  fromX: number,
  fromZ: number,
  fromHeading: number,
  toX: number,
  toZ: number,
  toHeading: number,
): DominoSlot[] {
  const path = planUturnPath({ x: fromX, z: fromZ }, fromHeading, { x: toX, z: toZ }, toHeading);

  let arcLength = 0;
  const points: { x: number; z: number; s: number }[] = [{ ...path[0], s: 0 }];
  for (let i = 1; i < path.length; i += 1) {
    arcLength += vLen(vSub(path[i], path[i - 1]));
    points.push({ ...path[i], s: arcLength });
  }

  // Distribute dominos evenly along the path (endpoints are the row dominos).
  const count = Math.max(1, Math.round(arcLength / CURVE_PITCH_M));
  const spacing = arcLength / count;

  const slots: DominoSlot[] = [];
  let k = 1;
  let target = spacing;
  for (let i = 1; i < points.length && k < count; i += 1) {
    if (points[i].s < target) continue;
    const dx = points[i].x - points[i - 1].x;
    const dz = points[i].z - points[i - 1].z;
    slots.push({
      row: -1,
      col: -1,
      baseX: points[i].x,
      baseZ: points[i].z,
      heading: Math.atan2(-dz, dx),
      angle: 0,
    });
    k += 1;
    target = k * spacing;
  }
  return slots;
}

function buildDominoes() {
  if (!scene) return;
  disposeDominoMesh();

  const { rows, cols, cells } = props.projectData;
  toppleDir = props.projectData.toppleDirection ?? 'horizontal';
  const colorMap = new Map(props.colors.map((color) => [color.id, color]));

  dominoSlots = [];
  chains = [];
  lines = [];
  pendingStarts = [];

  // Heading of a line that falls in the +axis direction, and its reverse.
  const forwardHeading = toppleDir === 'horizontal' ? 0 : -Math.PI / 2;
  const reverseHeading = toppleDir === 'horizontal' ? Math.PI : Math.PI / 2;

  const instanceByCell = new Map<number, number>();
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      if (!cells[row * cols + col]) continue;
      const alongIdx = toppleDir === 'horizontal' ? col : row;
      const acrossIdx = toppleDir === 'horizontal' ? row : col;
      const along = (alongIdx - ((toppleDir === 'horizontal' ? cols : rows) - 1) / 2) * DOMINO_COL_SPACING_M;
      const across = (acrossIdx - ((toppleDir === 'horizontal' ? rows : cols) - 1) / 2) * DOMINO_ROW_SPACING_M;
      instanceByCell.set(row * cols + col, dominoSlots.length);
      dominoSlots.push({
        row,
        col,
        baseX: toppleDir === 'horizontal' ? along : across,
        baseZ: toppleDir === 'horizontal' ? across : along,
        heading: forwardHeading,
        angle: 0,
      });
    }
  }

  const fieldCount = dominoSlots.length;
  if (fieldCount === 0) {
    status.value = 'No dominos in field';
    return;
  }

  // Collect runs of consecutive occupied cells per line along the topple axis.
  const lineCount = toppleDir === 'horizontal' ? rows : cols;
  const lineLength = toppleDir === 'horizontal' ? cols : rows;

  for (let line = 0; line < lineCount; line += 1) {
    const runs: { startPos: number; indices: number[] }[] = [];
    let run: number[] = [];
    let runStart = 0;

    for (let pos = 0; pos <= lineLength; pos += 1) {
      const row = toppleDir === 'horizontal' ? line : pos;
      const col = toppleDir === 'horizontal' ? pos : line;
      const instance = pos < lineLength ? instanceByCell.get(row * cols + col) : undefined;
      if (instance !== undefined) {
        if (run.length === 0) runStart = pos;
        run.push(instance);
      } else if (run.length) {
        runs.push({ startPos: runStart, indices: run });
        run = [];
      }
    }
    if (runs.length === 0) continue;

    // Serpentine: every other non-empty line topples in the reverse direction.
    const ordinal = lines.length;
    const reversed = triggerPattern.value === 'serpentine' && ordinal % 2 === 1;
    const heading = reversed ? reverseHeading : forwardHeading;
    const orderedRuns = reversed ? [...runs].reverse() : runs;

    const chainIdxs: number[] = [];
    for (let r = 0; r < orderedRuns.length; r += 1) {
      const indices = reversed ? [...orderedRuns[r].indices].reverse() : orderedRuns[r].indices;
      for (const idx of indices) dominoSlots[idx].heading = heading;

      const chainIdx = chains.length;
      chains.push({
        indices,
        headPos: -1,
        headAngle: 0,
        headOmega: 0,
        done: false,
        stalled: false,
        nextChain: null,
        linkAngle: 0,
      });
      chainIdxs.push(chainIdx);

      if (r > 0) {
        // Pitches between the facing ends of this run and the previous one.
        const a = orderedRuns[r - 1];
        const b = orderedRuns[r];
        const centerSteps = reversed
          ? a.startPos - (b.startPos + b.indices.length - 1)
          : b.startPos - (a.startPos + a.indices.length - 1);
        const faceGap = centerSteps * DOMINO_COL_SPACING_M - DOMINO_THICKNESS_M;
        if (faceGap < DOMINO_HEIGHT_M * MAX_REACH_FRACTION) {
          chains[chainIdx - 1].nextChain = chainIdx;
          chains[chainIdx - 1].linkAngle = Math.asin(faceGap / DOMINO_HEIGHT_M);
        }
      }
    }
    lines.push({ line, chainIdxs });
  }

  // Serpentine: place physical U-turn connector dominos between consecutive
  // lines and link the chains through them.
  if (triggerPattern.value === 'serpentine') {
    for (let k = 0; k < lines.length - 1; k += 1) {
      const fromChain = chains[lines[k].chainIdxs[lines[k].chainIdxs.length - 1]];
      const toChain = chains[lines[k + 1].chainIdxs[0]];
      const fromSlot = dominoSlots[fromChain.indices[fromChain.indices.length - 1]];
      const toSlot = dominoSlots[toChain.indices[0]];

      const uturnSlots = buildUturnSlots(
        fromSlot.baseX,
        fromSlot.baseZ,
        fromSlot.heading,
        toSlot.baseX,
        toSlot.baseZ,
        toSlot.heading,
      );

      if (uturnSlots.length === 0) {
        // Degenerate case (lines virtually touching): hand off directly.
        fromChain.nextChain = lines[k + 1].chainIdxs[0];
        fromChain.linkAngle = TRIGGER_ANGLE;
        continue;
      }

      const startIdx = dominoSlots.length;
      dominoSlots.push(...uturnSlots);
      const connectorChainIdx = chains.length;
      chains.push({
        indices: uturnSlots.map((_, j) => startIdx + j),
        headPos: -1,
        headAngle: 0,
        headOmega: 0,
        done: false,
        stalled: false,
        nextChain: lines[k + 1].chainIdxs[0],
        linkAngle: TRIGGER_ANGLE,
      });
      fromChain.nextChain = connectorChainIdx;
      fromChain.linkAngle = TRIGGER_ANGLE;
    }
  }

  const geometry = new THREE.BoxGeometry(DOMINO_THICKNESS_M, DOMINO_HEIGHT_M, DOMINO_WIDTH_M);
  const material = new THREE.MeshStandardMaterial({ color: 0xffffff });
  instancedMesh = new THREE.InstancedMesh(geometry, material, dominoSlots.length);
  instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

  const color = new THREE.Color();
  for (let i = 0; i < dominoSlots.length; i += 1) {
    const slot = dominoSlots[i];
    if (slot.row < 0) {
      color.set(CONNECTOR_COLOR);
    } else {
      const cellColor = cells[slot.row * cols + slot.col];
      color.set(cellColor ? colorMap.get(cellColor)?.hex ?? '#888888' : '#888888');
    }
    instancedMesh.setColorAt(i, color);
    writeDominoMatrix(i);
  }

  instancedMesh.instanceMatrix.needsUpdate = true;
  if (instancedMesh.instanceColor) instancedMesh.instanceColor.needsUpdate = true;
  scene.add(instancedMesh);

  const connectorCount = dominoSlots.length - fieldCount;
  const viable = dominoChainViable() ? '' : ' - gap may be too tight for reliable chains';
  status.value = connectorCount
    ? `${fieldCount} field dominos + ${connectorCount} U-turn dominos${viable}`
    : `${fieldCount} field dominos${viable}`;

  const spanAlong = (toppleDir === 'horizontal' ? cols : rows) * DOMINO_COL_SPACING_M;
  const spanAcross = (toppleDir === 'horizontal' ? rows : cols) * DOMINO_ROW_SPACING_M;
  const spanX = toppleDir === 'horizontal' ? spanAlong : spanAcross;
  const spanZ = toppleDir === 'horizontal' ? spanAcross : spanAlong;
  const viewDistance = Math.max(spanX, spanZ, 0.2) * 1.4;
  camera?.position.set(viewDistance * 0.65, viewDistance * 0.75, viewDistance);
  if (controls) controls.target.set(0, DOMINO_HEIGHT_M * 0.35, 0);
}

/**
 * Compose the instance matrix: yaw the domino to its heading, then tilt it
 * about the bottom edge facing the fall direction. Local +X is the fall
 * direction; geometry is (thickness, height, width) in local axes.
 */
function writeDominoMatrix(index: number) {
  if (!instancedMesh) return;
  const slot = dominoSlots[index];

  tempMatrix.makeTranslation(slot.baseX, 0, slot.baseZ);
  tempEuler.set(0, slot.heading, 0);
  tempQuaternion.setFromEuler(tempEuler);
  stepMatrix.makeRotationFromQuaternion(tempQuaternion);
  tempMatrix.multiply(stepMatrix);
  stepMatrix.makeTranslation(D / 2, 0, 0);
  tempMatrix.multiply(stepMatrix);
  stepMatrix.makeRotationZ(-slot.angle);
  tempMatrix.multiply(stepMatrix);
  stepMatrix.makeTranslation(-D / 2, H / 2, 0);
  tempMatrix.multiply(stepMatrix);
  instancedMesh.setMatrixAt(index, tempMatrix);
}

function triggerChain(chainIdx: number, omega: number) {
  const chain = chains[chainIdx];
  if (chain.headPos >= 0) return;
  chain.headPos = 0;
  chain.headAngle = 0;
  chain.headOmega = omega;
}

function startChainReaction() {
  if (!chains.length || !lines.length) return;
  resetDominoStates();
  status.value = 'Toppling...';

  if (triggerPattern.value === 'serpentine') {
    // One pushed domino; U-turn connectors carry the wave line to line.
    triggerChain(lines[0].chainIdxs[0], INITIAL_OMEGA);
    return;
  }

  // Field starter: one pushed domino starts an edge toppling line that fires each
  // line as the wave passes it.
  const firstLine = lines[0].line;
  pendingStarts = lines.map(({ line, chainIdxs }) => ({
    chainIdx: chainIdxs[0],
    time: ((line - firstLine) * DOMINO_ROW_SPACING_M) / EDGE_WAVE_SPEED,
  }));
}

function resetDominoStates() {
  pendingStarts = [];
  simClock = 0;
  for (const chain of chains) {
    chain.headPos = -1;
    chain.headAngle = 0;
    chain.headOmega = 0;
    chain.done = false;
    chain.stalled = false;
  }
  for (let i = 0; i < dominoSlots.length; i += 1) {
    dominoSlots[i].angle = 0;
    writeDominoMatrix(i);
  }
  if (instancedMesh) instancedMesh.instanceMatrix.needsUpdate = true;
}

function resetDominoes() {
  buildDominoes();
}

function stepSimulation(dt: number) {
  if (!instancedMesh || !chains.length) return;

  simClock += dt;
  if (pendingStarts.length) {
    const due = pendingStarts.filter((entry) => entry.time <= simClock);
    if (due.length) {
      for (const entry of due) triggerChain(entry.chainIdx, INITIAL_OMEGA);
      pendingStarts = pendingStarts.filter((entry) => entry.time > simClock);
    }
  }

  let anyActive = pendingStarts.length > 0;
  let anyStarted = false;
  let anyStalled = false;

  for (const chain of chains) {
    if (chain.headPos >= 0) anyStarted = true;
    if (chain.headPos < 0 || chain.done) continue;
    anyActive = true;

    // Head dynamics: gravity torque about the pivot edge plus the push of the
    // leaning train behind it (the mechanism that sustains the soliton).
    let alpha = ALPHA_FACTOR * (H * Math.sin(chain.headAngle) - D * Math.cos(chain.headAngle));
    if (chain.headPos > 0) {
      alpha += (TRAIN_PUSH * Math.min(chain.headPos, TRAIN_PUSH_DEPTH)) / TRAIN_PUSH_DEPTH;
    }
    chain.headOmega += alpha * dt;
    chain.headAngle += chain.headOmega * dt;

    // Stall: the push wasn't enough to carry the head past its balance angle.
    if (chain.headOmega <= 0 && chain.headAngle < BALANCE_ANGLE) {
      chain.headAngle = Math.max(chain.headAngle, 0);
      chain.headOmega = 0;
      chain.done = true;
      chain.stalled = true;
      anyStalled = true;
    }

    const lastPos = chain.indices.length - 1;

    // Strike the next domino: it becomes the new head, the old head joins the train.
    if (chain.headPos < lastPos && chain.headAngle >= TRIGGER_ANGLE) {
      chain.headPos += 1;
      chain.headAngle -= TRIGGER_ANGLE;
      chain.headOmega *= COLLISION_TRANSFER;
    }

    if (chain.headPos === lastPos) {
      // Last domino: strike the next chain (gap jump or U-turn handoff)...
      if (chain.nextChain !== null && chain.headAngle >= chain.linkAngle) {
        triggerChain(chain.nextChain, Math.max(chain.headOmega * 0.7, INITIAL_OMEGA * 0.8));
      }
      // ...and fall flat, since nothing rests against it.
      if (chain.headAngle >= Math.PI / 2) {
        chain.headAngle = Math.PI / 2;
        chain.headOmega = 0;
        chain.done = true;
      }
    }

    // Write head and trailing train angles via the van Leeuwen recursion.
    let angle = chain.headAngle;
    let slotIndex = chain.indices[chain.headPos];
    dominoSlots[slotIndex].angle = angle;
    writeDominoMatrix(slotIndex);
    const depth = Math.min(chain.headPos, TRAIN_DEPTH);
    for (let j = 1; j <= depth; j += 1) {
      angle = dominoTrainAngleBehind(angle);
      slotIndex = chain.indices[chain.headPos - j];
      dominoSlots[slotIndex].angle = angle;
      writeDominoMatrix(slotIndex);
    }
  }

  instancedMesh.instanceMatrix.needsUpdate = true;

  if (status.value === 'Toppling...' && anyStarted && !anyActive) {
    const lastLine = lines[lines.length - 1];
    const fieldComplete = chains[lastLine.chainIdxs[lastLine.chainIdxs.length - 1]].done;
    if (anyStalled) status.value = 'Chain stalled';
    else if (fieldComplete) status.value = 'Chain complete';
    else status.value = 'Chain stopped - gap too wide to jump';
  }
}

function animate() {
  animationId = requestAnimationFrame(animate);
  if (!renderer || !scene || !camera) return;

  const dt = slowMo.value ? 0.004 : 0.016;
  stepSimulation(dt);
  controls?.update();
  renderer.render(scene, camera);
}
</script>

<template>
  <v-card>
    <v-card-title class="d-flex justify-space-between align-center flex-wrap ga-2">
      <span>3D Preview</span>
      <div class="d-flex ga-2 align-center">
        <v-select
          v-model="triggerPattern"
          :items="[
            { title: 'Toppling line (row by row)', value: 'serpentine' },
            { title: 'Field starter (all rows)', value: 'fieldStarter' },
          ]"
          label="Pattern"
          density="compact"
          hide-details
          style="min-width: 230px"
        />
        <v-btn size="small" @click="startChainReaction">Topple</v-btn>
        <v-btn size="small" @click="resetDominoes">Reset</v-btn>
        <v-btn size="small" :color="slowMo ? 'primary' : undefined" @click="slowMo = !slowMo">Slow-mo</v-btn>
      </div>
    </v-card-title>
    <v-card-subtitle>{{ status }}</v-card-subtitle>
    <div ref="container" class="preview-canvas" />
  </v-card>
</template>

<style scoped>
.preview-canvas {
  width: 100%;
  height: 520px;
}
</style>
