import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { initXR } from './core/xr.js';
import { initControllers, updateControllers } from './core/controllers.js';
import { initTeleport, updateTeleport } from './core/teleport.js';
import { initGrid } from './core/grid.js';

import { initInputUI, handleUISelection } from './core/inputUI.js';
import { initVectorUI, setVectorFromComponents } from './core/vectorUI.js';
import { createPoint } from './core/geometryFactory.js';

let scene, camera, renderer;
let rig;

init();
animate();

function init() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x202040);

  // ✅ Rig (Spieler)
  rig = new THREE.Group();
  scene.add(rig);

  // ✅ Kamera INS Rig
  camera = new THREE.PerspectiveCamera(
    70,
    window.innerWidth / window.innerHeight,
    0.1,
    100
  );
  rig.add(camera);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true;

  document.body.appendChild(renderer.domElement);

  initXR(renderer);
  initGrid(scene);

  // ✅ Licht
  const light = new THREE.HemisphereLight(0xffffff, 0x444444, 1.2);
  scene.add(light);

  const dirLight = new THREE.DirectionalLight(0xffffff, 1);
  dirLight.position.set(3, 6, 4);
  scene.add(dirLight);

  // ✅ Boden
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(40, 40),
    new THREE.MeshStandardMaterial({ color: 0x222222 })
  );
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);

  // ✅ Achsen (Math-Buch Standard)
  createMathTextbookAxes(10);

  // ✅ Controller
  const controllers = initControllers(renderer, rig);

  // ✅ UI an linken Controller hängen
  initInputUI(scene, camera, rig, controllers.left, controllers.right, {
    onCreatePoint: (x, y, z) => {
      // Punkt anzeigen
      createPoint(scene, x, y, z, 0xff0000, 0.05);

      // Vektor anzeigen (inkl. vx, vy, vz Labels)
      setVectorFromComponents(x, y, z, {
        lineColor: 0x00ffcc,
        pointColor: 0x00ff00
      });
    }
  });

  // UI Interaktion - Right controller for button selection
  controllers.right.addEventListener('selectstart', () => {
    handleUISelection();
  });

  // ✅ Teleport nutzt Rig (wichtig!)
  initTeleport(renderer, scene, rig);

  // ✅ Vektor-Bildschirm / Vektor-UI
  initVectorUI(scene);
}

/**
 * Creates custom axes for math textbook standard:
 * X-axis (red) → forward/backward (positive towards viewer +Z, negative away -Z)
 * Y-axis (green) → left/right (positive right +X, negative left -X)
 * Z-axis (blue) → up/down (positive up +Y, negative down -Y)
 */
function createMathTextbookAxes(length) {
  const axesGroup = new THREE.Group();
  
  // X-axis: forward towards viewer (red) - maps to +Z in Three.js
  const xGeometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 0, length)
  ]);
  const xMaterial = new THREE.LineBasicMaterial({ color: 0xff0000, linewidth: 2 });
  const xLine = new THREE.Line(xGeometry, xMaterial);
  axesGroup.add(xLine);
  
  // Add arrow for X
  const xArrow = new THREE.ArrowHelper(
    new THREE.Vector3(0, 0, 1),
    new THREE.Vector3(0, 0, 0),
    length,
    0xff0000,
    length * 0.2,
    length * 0.1
  );
  axesGroup.add(xArrow);

  // Y-axis: right (green) - maps to +X in Three.js
  const yGeometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(length, 0, 0)
  ]);
  const yMaterial = new THREE.LineBasicMaterial({ color: 0x00ff00, linewidth: 2 });
  const yLine = new THREE.Line(yGeometry, yMaterial);
  axesGroup.add(yLine);
  
  // Add arrow for Y
  const yArrow = new THREE.ArrowHelper(
    new THREE.Vector3(1, 0, 0),
    new THREE.Vector3(0, 0, 0),
    length,
    0x00ff00,
    length * 0.2,
    length * 0.1
  );
  axesGroup.add(yArrow);

  // Z-axis: up (blue) - maps to +Y in Three.js
  const zGeometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, length, 0)
  ]);
  const zMaterial = new THREE.LineBasicMaterial({ color: 0x0000ff, linewidth: 2 });
  const zLine = new THREE.Line(zGeometry, zMaterial);
  axesGroup.add(zLine);
  
  // Add arrow for Z
  const zArrow = new THREE.ArrowHelper(
    new THREE.Vector3(0, 1, 0),
    new THREE.Vector3(0, 0, 0),
    length,
    0x0000ff,
    length * 0.2,
    length * 0.1
  );
  axesGroup.add(zArrow);

  // Add labels
  const labelGroup = new THREE.Group();
  labelGroup.position.copy(axesGroup.position);
  
  addAxisLabel('X', new THREE.Vector3(0, 0, length + 0.5), labelGroup);
  addAxisLabel('Y', new THREE.Vector3(length + 0.5, 0, 0), labelGroup);
  addAxisLabel('Z', new THREE.Vector3(0, length + 0.5, 0), labelGroup);
  
  axesGroup.add(labelGroup);
  scene.add(axesGroup);
}

/**
 * Helper function to add text labels to axes
 */
function addAxisLabel(text, position, group) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  canvas.width = 256;
  canvas.height = 256;
  
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = 'rgba(255,255,255,1)';
  ctx.font = 'bold 100px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);
  
  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
  const sprite = new THREE.Sprite(material);
  sprite.position.copy(position);
  sprite.scale.set(0.5, 0.5, 1);
  
  group.add(sprite);
}

function animate() {
  renderer.setAnimationLoop(() => {
    updateControllers();
    updateTeleport();
    renderer.render(scene, camera);
  });
}
