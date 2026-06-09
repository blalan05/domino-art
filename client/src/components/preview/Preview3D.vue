<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { Color, FieldProjectData } from '@domino-art/shared';

const props = defineProps<{
  projectData: FieldProjectData;
  colors: Color[];
}>();

const container = ref<HTMLDivElement | null>(null);
const slowMo = ref(false);
const status = ref('Ready');

let renderer: THREE.WebGLRenderer | null = null;
let scene: THREE.Scene | null = null;
let camera: THREE.PerspectiveCamera | null = null;
let controls: OrbitControls | null = null;
let instancedMesh: THREE.InstancedMesh | null = null;
let animationId = 0;
let velocities: Float32Array | null = null;
let awake: boolean[] = [];

const DOMINO_WIDTH = 0.0246063;
const DOMINO_HEIGHT = 0.0787402;
const DOMINO_DEPTH = 0.004;

onMounted(() => {
  if (!container.value) return;
  initScene(container.value);
  buildDominoes();
  animate();
});

onBeforeUnmount(() => {
  cancelAnimationFrame(animationId);
  controls?.dispose();
  renderer?.dispose();
});

function initScene(el: HTMLDivElement) {
  const width = el.clientWidth;
  const height = el.clientHeight;
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(width, height);
  el.appendChild(renderer.domElement);

  scene = new THREE.Scene();
  scene.background = new THREE.Color('#111827');

  camera = new THREE.PerspectiveCamera(55, width / height, 0.01, 200);
  camera.position.set(0.8, 0.8, 1.2);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;

  const light = new THREE.DirectionalLight(0xffffff, 1.2);
  light.position.set(2, 4, 3);
  scene.add(light);
  scene.add(new THREE.AmbientLight(0xffffff, 0.35));

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(4, 4),
    new THREE.MeshStandardMaterial({ color: '#1f2937' }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.001;
  scene.add(ground);
}

function buildDominoes() {
  if (!scene) return;
  if (instancedMesh) {
    scene.remove(instancedMesh);
    instancedMesh.geometry.dispose();
    (instancedMesh.material as THREE.Material).dispose();
  }

  const { rows, cols, cells } = props.projectData;
  const count = rows * cols;
  const geometry = new THREE.BoxGeometry(DOMINO_DEPTH, DOMINO_HEIGHT, DOMINO_WIDTH);
  const material = new THREE.MeshStandardMaterial({ color: 0xffffff });
  instancedMesh = new THREE.InstancedMesh(geometry, material, count);
  instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

  const colorMap = new Map(props.colors.map((color) => [color.id, color]));
  const matrix = new THREE.Matrix4();
  const color = new THREE.Color();
  velocities = new Float32Array(count * 3);
  awake = Array.from({ length: count }, () => false);

  let i = 0;
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const cellColor = cells[row * cols + col];
      const x = (col - cols / 2) * (DOMINO_WIDTH + 0.002);
      const z = (row - rows / 2) * (DOMINO_WIDTH + 0.002);
      matrix.makeTranslation(x, DOMINO_HEIGHT / 2, z);
      instancedMesh.setMatrixAt(i, matrix);
      color.set(cellColor ? colorMap.get(cellColor)?.hex ?? '#888888' : '#444444');
      instancedMesh.setColorAt(i, color);
      i += 1;
    }
  }

  instancedMesh.instanceMatrix.needsUpdate = true;
  if (instancedMesh.instanceColor) instancedMesh.instanceColor.needsUpdate = true;
  scene.add(instancedMesh);
}

function toppleAt(instanceIndex: number) {
  if (!velocities) return;
  awake[instanceIndex] = true;
  velocities[instanceIndex * 3] = 0.02;
  velocities[instanceIndex * 3 + 1] = 0.01;
  velocities[instanceIndex * 3 + 2] = 0.03;
  status.value = 'Toppling...';
}

function resetDominoes() {
  buildDominoes();
  status.value = 'Reset';
}

function animate() {
  animationId = requestAnimationFrame(animate);
  if (!instancedMesh || !velocities || !renderer || !scene || !camera) return;

  const dt = slowMo.value ? 0.008 : 0.016;
  const matrix = new THREE.Matrix4();
  const position = new THREE.Vector3();
  const quaternion = new THREE.Quaternion();
  const scale = new THREE.Vector3(1, 1, 1);

  for (let i = 0; i < instancedMesh.count; i += 1) {
    if (!awake[i]) continue;
    instancedMesh.getMatrixAt(i, matrix);
    matrix.decompose(position, quaternion, scale);
    position.x += velocities[i * 3] * dt * 60;
    position.y += velocities[i * 3 + 1] * dt * 60;
    position.z += velocities[i * 3 + 2] * dt * 60;
    velocities[i * 3 + 1] -= 0.0008 * dt * 60;
    quaternion.multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(0.04, 0, 0.02)));
    matrix.compose(position, quaternion, scale);
    instancedMesh.setMatrixAt(i, matrix);

    const neighbor = i + 1;
    if (neighbor < instancedMesh.count && awake[i] && !awake[neighbor]) {
      awake[neighbor] = true;
      velocities[neighbor * 3] = 0.015;
      velocities[neighbor * 3 + 2] = 0.02;
    }
  }

  instancedMesh.instanceMatrix.needsUpdate = true;
  controls?.update();
  renderer.render(scene, camera);
}
</script>

<template>
  <v-card>
    <v-card-title class="d-flex justify-space-between align-center">
      <span>3D Preview</span>
      <div class="d-flex ga-2">
        <v-btn size="small" @click="toppleAt(0)">Topple</v-btn>
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
