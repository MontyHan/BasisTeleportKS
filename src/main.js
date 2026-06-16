import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { initXR } from './core/xr.js';
import { initControllers, updateControllers } from './core/controllers.js';
import { initTeleport, updateTeleport } from './core/teleport.js';
import { initGrid } from './core/grid.js';

import {
  initInputUI, handleUISelection, setPanelStatus,
  getLambdaValue, getInputValues
} from './core/inputUI.js';
import { initVectorUI, addOrtsvektorForPoint, toggleOrtsvektoren } from './core/vectorUI.js';
import { createPoint, createGerade, createRichtungsvektor, createGeradengleichungLabel } from './core/geometryFactory.js';

let scene, camera, renderer;
let rig;
let rightController;

let pointCounter = 0;
const allPointMeshes = []; // { mesh, mathCoords:{x,y,z}, originalColor }
const allGeraden    = []; // { line, rvArrow, rvLabel, ggLabel, marker, p1Math, p2Math }
const allVektoren   = []; // { arrow, label, p1Math, p2Math }
const laengeMarkers = []; // { mesh, lengthValue } — temporär für LAENGE-Modus

let appMode = 'normal';
// 'normal' | 'select-gerade-1' | 'select-gerade-2'
// | 'select-vektor-1'  | 'select-vektor-2'
// | 'select-param-gerade'
// | 'select-vector-length'
// | 'select-delete-punkt' | 'select-delete-gerade'
let selectedP1 = null;

let richtungsvektorGroup;
let geradengleichungGroup;
let geradenLinienGroup;
let bodenKSGroup;

const pointRaycaster  = new THREE.Raycaster();
const pointTempMatrix = new THREE.Matrix4();

init();
animate();

function init() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x202040);

  rig = new THREE.Group();
  rig.position.set(3, 0, 3);
  scene.add(rig);

  camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 100);
  rig.add(camera);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true;
  document.body.appendChild(renderer.domElement);

  initXR(renderer);
  initGrid(scene);

  const light = new THREE.HemisphereLight(0xffffff, 0x444444, 1.2);
  scene.add(light);
  const dirLight = new THREE.DirectionalLight(0xffffff, 1);
  dirLight.position.set(3, 6, 4);
  scene.add(dirLight);

  // Durchscheinender Boden
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(40, 40),
    new THREE.MeshStandardMaterial({ color: 0x334466, transparent: true, opacity: 0.18, side: THREE.DoubleSide })
  );
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);

  createVersionLabel('Version 8');
  createMathTextbookAxes(10);

  const controllers = initControllers(renderer, rig);
  rightController = controllers.right;

  richtungsvektorGroup = new THREE.Group();
  richtungsvektorGroup.visible = true;
  scene.add(richtungsvektorGroup);

  geradengleichungGroup = new THREE.Group();
  geradengleichungGroup.visible = false;
  scene.add(geradengleichungGroup);

  geradenLinienGroup = new THREE.Group();
  geradenLinienGroup.visible = true;
  scene.add(geradenLinienGroup);

  bodenKSGroup = createBodenKSLabels();
  scene.add(bodenKSGroup);

  initVectorUI(scene);

  initInputUI(scene, camera, rig, controllers.left, controllers.right, {
    onCreatePoint: (x, y, z) => {
      addFullPoint(x, y, z, 0xff0000);
    },

    onGeradeMode: () => {
      if (appMode === 'select-gerade-1' || appMode === 'select-gerade-2') { cancelSelection(); return; }
      if (appMode !== 'normal') cancelSelection();
      appMode = 'select-gerade-1';
      setPanelStatus('Punkt 1 waehlen...', '#ffff00');
    },

    onVektorMode: () => {
      if (appMode === 'select-vektor-1' || appMode === 'select-vektor-2') { cancelSelection(); return; }
      if (appMode !== 'normal') cancelSelection();
      appMode = 'select-vektor-1';
      setPanelStatus('Vekt. P1 waehlen...', '#ffff00');
    },

    onParamMode: () => {
      if (appMode === 'select-param-gerade') { cancelSelection(); return; }
      if (allGeraden.length === 0) { setPanelStatus('Erst Gerade erstellen!', '#ff4444'); return; }
      if (appMode !== 'normal') cancelSelection();
      appMode = 'select-param-gerade';
      allGeraden.forEach(g => { g.marker.visible = true; });
      setPanelStatus('λ gesetzt. Gerade waehlen.', '#88ffff');
    },

    onLaengeMode: () => {
      if (appMode === 'select-vector-length') { cancelSelection(); return; }
      if (appMode !== 'normal') cancelSelection();
      enterLaengeMode();
    },

    onDeleteMode: (type) => {
      if (type === 'punkt') {
        if (appMode === 'select-delete-punkt') { cancelSelection(); return; }
        if (appMode !== 'normal') cancelSelection();
        appMode = 'select-delete-punkt';
        setPanelStatus('Punkt loeschen...', '#ff6666');
      } else if (type === 'gerade') {
        if (appMode === 'select-delete-gerade') { cancelSelection(); return; }
        if (appMode !== 'normal') cancelSelection();
        appMode = 'select-delete-gerade';
        allGeraden.forEach(g => { g.marker.visible = true; });
        setPanelStatus('Gerade loeschen...', '#ff6666');
      }
    },

    onToggleOrtsvektoren:     (v) => { toggleOrtsvektoren(v); },
    onToggleRichtungsvektor:  (v) => { richtungsvektorGroup.visible = v; },
    onToggleGeradengleichung: (v) => { geradengleichungGroup.visible = v; },
    onToggleGL:               (v) => { geradenLinienGroup.visible = v; },
    onToggleBodenKS:          (v) => { bodenKSGroup.visible = v; }
  });

  controllers.right.addEventListener('selectstart', () => {
    const hitUI = handleUISelection();
    if (!hitUI && appMode !== 'normal') handleRaycast();
  });

  initTeleport(renderer, scene, rig);
}

// ===== Hilfsfunktion: vollständigen Punkt anlegen =====

function addFullPoint(mx, my, mz, color = 0xff0000) {
  const mesh = createPoint(scene, my, mz, mx, color, color === 0xff0000 ? 0.05 : 0.07);
  allPointMeshes.push({ mesh, mathCoords: { x: mx, y: my, z: mz }, originalColor: color });
  addOrtsvektorForPoint(mesh, mx, my, mz, pointCounter++);
  return mesh;
}

// ===== LAENGE-Modus =====

function enterLaengeMode() {
  const totalVectors = allPointMeshes.length + allVektoren.length + allGeraden.length;
  if (totalVectors === 0) { setPanelStatus('Keine Vektoren!', '#ff4444'); return; }

  // OV-Marker an Punkt-Positionen
  for (const pd of allPointMeshes) {
    const c = pd.mathCoords;
    const len = Math.sqrt(c.x * c.x + c.y * c.y + c.z * c.z);
    const marker = new THREE.Mesh(
      new THREE.SphereGeometry(0.07, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0x00ffff })
    );
    // Endpunkt des OV = Three.js (y, z, x)
    marker.position.set(c.y, c.z, c.x);
    scene.add(marker);
    laengeMarkers.push({ mesh: marker, lengthValue: len });
  }

  // Standalone Vektor-Marker
  for (const v of allVektoren) {
    if (!v.p1Math || !v.p2Math) continue;
    const d = {
      x: v.p2Math.x - v.p1Math.x,
      y: v.p2Math.y - v.p1Math.y,
      z: v.p2Math.z - v.p1Math.z
    };
    const len = Math.sqrt(d.x * d.x + d.y * d.y + d.z * d.z);
    const marker = new THREE.Mesh(
      new THREE.SphereGeometry(0.07, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0x00ffff })
    );
    marker.position.set(v.p2Math.y, v.p2Math.z, v.p2Math.x);
    scene.add(marker);
    laengeMarkers.push({ mesh: marker, lengthValue: len });
  }

  // Gerade-RV-Marker
  for (const g of allGeraden) {
    const d = {
      x: g.p2Math.x - g.p1Math.x,
      y: g.p2Math.y - g.p1Math.y,
      z: g.p2Math.z - g.p1Math.z
    };
    const len = Math.sqrt(d.x * d.x + d.y * d.y + d.z * d.z);
    const marker = new THREE.Mesh(
      new THREE.SphereGeometry(0.07, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0x00ffff })
    );
    marker.position.set(g.p2Math.y, g.p2Math.z, g.p2Math.x);
    scene.add(marker);
    laengeMarkers.push({ mesh: marker, lengthValue: len });
  }

  appMode = 'select-vector-length';
  setPanelStatus('Vektorspitze waehlen', '#00ffff');
}

function clearLaengeMarkers() {
  laengeMarkers.forEach(m => scene.remove(m.mesh));
  laengeMarkers.length = 0;
}

// ===== Hauptraycast-Handler =====

function handleRaycast() {
  if (!rightController) return;

  pointTempMatrix.identity().extractRotation(rightController.matrixWorld);
  pointRaycaster.ray.origin.setFromMatrixPosition(rightController.matrixWorld);
  pointRaycaster.ray.direction.set(0, 0, -1).applyMatrix4(pointTempMatrix);
  pointRaycaster.far = 20;

  // --- Modi die auf Punkte zielen ---
  if (
    appMode === 'select-gerade-1'  || appMode === 'select-gerade-2' ||
    appMode === 'select-vektor-1'  || appMode === 'select-vektor-2' ||
    appMode === 'select-delete-punkt'
  ) {
    const meshes = allPointMeshes.map(p => p.mesh);
    const hits = pointRaycaster.intersectObjects(meshes, false);
    if (!hits.length) return;
    const pointData = allPointMeshes.find(p => p.mesh === hits[0].object);
    if (!pointData) return;

    if (appMode === 'select-vektor-1') {
      selectedP1 = pointData;
      pointData.mesh.material.color.setHex(0xff8800);
      appMode = 'select-vektor-2';
      setPanelStatus('Vekt. P2 waehlen...', '#ffaa00');

    } else if (appMode === 'select-vektor-2') {
      const p1 = selectedP1.mathCoords, p2 = pointData.mathCoords;
      const { arrow, label } = createRichtungsvektor(richtungsvektorGroup, p1, p2);
      allVektoren.push({ arrow, label, p1Math: { ...p1 }, p2Math: { ...p2 } });
      finishSelection();

    } else if (appMode === 'select-gerade-1') {
      selectedP1 = pointData;
      pointData.mesh.material.color.setHex(0xff8800);
      appMode = 'select-gerade-2';
      setPanelStatus('Punkt 2 waehlen...', '#ffaa00');

    } else if (appMode === 'select-gerade-2') {
      const p1 = selectedP1.mathCoords, p2 = pointData.mathCoords;
      const line   = createGerade(geradenLinienGroup, p1, p2);
      const { arrow: rvArrow, label: rvLabel } = createRichtungsvektor(richtungsvektorGroup, p1, p2);
      const ggLabel = createGeradengleichungLabel(p1, p2);
      geradengleichungGroup.add(ggLabel);

      const midThree = new THREE.Vector3(
        (p1.y + p2.y) / 2, (p1.z + p2.z) / 2, (p1.x + p2.x) / 2
      );
      const marker = new THREE.Mesh(
        new THREE.SphereGeometry(0.07, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0xffff00 })
      );
      marker.position.copy(midThree);
      marker.visible = false;
      scene.add(marker);

      allGeraden.push({ line, rvArrow, rvLabel, ggLabel, marker, p1Math: { ...p1 }, p2Math: { ...p2 } });
      finishSelection();

    } else if (appMode === 'select-delete-punkt') {
      if (pointData.mesh.userData.ortsvektor) {
        pointData.mesh.userData.ortsvektor.parent?.remove(pointData.mesh.userData.ortsvektor);
      }
      scene.remove(pointData.mesh);
      allPointMeshes.splice(allPointMeshes.indexOf(pointData), 1);
      appMode = 'normal';
      setPanelStatus('Bereit');
    }

  // --- Modi die auf Geraden-Marker zielen ---
  } else if (appMode === 'select-delete-gerade' || appMode === 'select-param-gerade') {
    const markers = allGeraden.map(g => g.marker);
    const hits = pointRaycaster.intersectObjects(markers, false);
    if (!hits.length) return;
    const geradeData = allGeraden.find(g => g.marker === hits[0].object);
    if (!geradeData) return;

    if (appMode === 'select-delete-gerade') {
      geradenLinienGroup.remove(geradeData.line);
      if (geradeData.rvArrow) richtungsvektorGroup.remove(geradeData.rvArrow);
      if (geradeData.rvLabel) richtungsvektorGroup.remove(geradeData.rvLabel);
      geradengleichungGroup.remove(geradeData.ggLabel);
      scene.remove(geradeData.marker);
      allGeraden.splice(allGeraden.indexOf(geradeData), 1);

    } else if (appMode === 'select-param-gerade') {
      // PARAM: Punkt auf der Gerade berechnen (λ aus Panel)
      const lambda = getLambdaValue();
      const OV = geradeData.p1Math;
      const RV = {
        x: geradeData.p2Math.x - OV.x,
        y: geradeData.p2Math.y - OV.y,
        z: geradeData.p2Math.z - OV.z
      };
      const mp = { x: OV.x + lambda * RV.x, y: OV.y + lambda * RV.y, z: OV.z + lambda * RV.z };
      // Als vollwertigen Punkt hinzufügen (blau, mit OV, löschbar, für Vektoren nutzbar)
      addFullPoint(mp.x, mp.y, mp.z, 0x44aaff);
    }

    allGeraden.forEach(g => { g.marker.visible = false; });
    appMode = 'normal';
    setPanelStatus('Bereit');

  // --- LAENGE-Modus ---
  } else if (appMode === 'select-vector-length') {
    const meshes = laengeMarkers.map(m => m.mesh);
    const hits = pointRaycaster.intersectObjects(meshes, false);
    if (!hits.length) return;
    const data = laengeMarkers.find(m => m.mesh === hits[0].object);
    if (!data) return;

    const rounded = Math.round(data.lengthValue * 100) / 100;
    setPanelStatus(`|u| = ${rounded}`, '#00ffff');
    clearLaengeMarkers();
    appMode = 'normal';
  }
}

function finishSelection() {
  if (selectedP1) {
    selectedP1.mesh.material.color.setHex(selectedP1.originalColor);
    selectedP1 = null;
  }
  appMode = 'normal';
  setPanelStatus('Bereit');
}

function cancelSelection() {
  if (selectedP1) {
    selectedP1.mesh.material.color.setHex(selectedP1.originalColor);
    selectedP1 = null;
  }
  allGeraden.forEach(g => { g.marker.visible = false; });
  clearLaengeMarkers();
  appMode = 'normal';
  setPanelStatus('Bereit');
}

// ===== Hilfsfunktionen Szene =====

function createBodenKSLabels() {
  const group = new THREE.Group();
  group.visible = false;
  for (let tX = -10; tX <= 10; tX++) {
    for (let tZ = -10; tZ <= 10; tZ++) {
      if (tX === 0 || tZ === 0) continue;
      const text = `(${tZ}/${tX})`; // mathX=tZ, mathY=tX
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = 128; canvas.height = 64;
      ctx.clearRect(0, 0, 128, 64);
      ctx.fillStyle = 'rgba(200,210,255,1)';
      ctx.font = 'bold 16px Arial';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(text, 64, 32);
      const texture = new THREE.CanvasTexture(canvas);
      texture.minFilter = THREE.LinearFilter;
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true }));
      sprite.scale.set(0.3, 0.15, 1);
      sprite.position.set(tX, 0.05, tZ);
      group.add(sprite);
    }
  }
  return group;
}

function createMathTextbookAxes(length) {
  const g = new THREE.Group();
  g.add(new THREE.ArrowHelper(new THREE.Vector3(0,0,1), new THREE.Vector3(0,0,0), length, 0xff0000, length*0.1, length*0.05));
  g.add(new THREE.ArrowHelper(new THREE.Vector3(1,0,0), new THREE.Vector3(0,0,0), length, 0x00ff00, length*0.1, length*0.05));
  g.add(new THREE.ArrowHelper(new THREE.Vector3(0,1,0), new THREE.Vector3(0,0,0), length, 0x0000ff, length*0.1, length*0.05));
  const lg = new THREE.Group();
  addAxisLabel('X', new THREE.Vector3(0, 0.2, length + 0.5), lg);
  addAxisLabel('Y', new THREE.Vector3(length + 0.5, 0.2, 0), lg);
  addAxisLabel('Z', new THREE.Vector3(0, length + 0.5, 0), lg);
  g.add(lg);
  scene.add(g);
}

function addAxisLabel(text, position, group) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = 256; canvas.height = 256;
  ctx.clearRect(0, 0, 256, 256);
  ctx.fillStyle = 'white';
  ctx.font = 'bold 100px Arial';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(text, 128, 128);
  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true }));
  sprite.position.copy(position);
  sprite.scale.set(0.5, 0.5, 1);
  group.add(sprite);
}

function createVersionLabel(version) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = 512; canvas.height = 128;
  ctx.clearRect(0, 0, 512, 128);
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.font = 'bold 64px Arial';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(version, 256, 64);
  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(2, 0.5),
    new THREE.MeshBasicMaterial({ map: texture, transparent: true, side: THREE.DoubleSide })
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(2, 0.01, 3);
  scene.add(mesh);
}

function animate() {
  renderer.setAnimationLoop(() => {
    updateControllers();
    updateTeleport();
    renderer.render(scene, camera);
  });
}
