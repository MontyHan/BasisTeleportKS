import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { initXR } from './core/xr.js';
import { initControllers, updateControllers } from './core/controllers.js';
import { initTeleport, updateTeleport } from './core/teleport.js';
import { initGrid } from './core/grid.js';

import {
  initInputUI, handleUISelection, setPanelStatus,
  getLambdaValue, getInputValues
} from './core/inputUI.js';
import {
  initVectorUI, addOrtsvektorForPoint, toggleOrtsvektoren,
  toggleKoordinaten, clearAllVectorUI
} from './core/vectorUI.js';
import {
  createPoint, createGerade, createRichtungsvektor, createGeradengleichungLabel
} from './core/geometryFactory.js';

let scene, camera, renderer;
let rig;
let rightController, leftController;

let pointCounter = 0;
const allPointMeshes = []; // { mesh, mathCoords:{x,y,z}, originalColor }
const allGeraden    = []; // { line, rvArrow, rvLabel, ggLabel, marker, p1Math, p2Math }
const allVektoren   = []; // { arrow, label, p1Math, p2Math }
const laengeMarkers = []; // { mesh, lengthValue }
const winkelMarkers = []; // { mesh, dir:{x,y,z} }

// Undo stack: { type:'addPoint'|'addGerade'|'addVektor', pd/gd/vd }
const undoStack = [];

let appMode = 'normal';
let selectedP1     = null; // for gerade/vektor selection
let selectedGerade1 = null; // for schnitt
let selectedWinkelDir1 = null; // for winkel

let richtungsvektorGroup;
let geradengleichungGroup;
let geradenLinienGroup;
let bodenKSGroup;

// Shared toggle state
let ovVisible  = false;
let rvVisible  = true;
let ggVisible  = false;
let glVisible  = true;
let ksVisible  = false;
let koVisible  = false;

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
  renderer.xr.setReferenceSpaceType('local-floor');
  document.body.appendChild(renderer.domElement);

  initXR(renderer);

  initGrid(scene);

  const light = new THREE.HemisphereLight(0xffffff, 0x444444, 1.2);
  scene.add(light);
  const dirLight = new THREE.DirectionalLight(0xffffff, 1);
  dirLight.position.set(3, 6, 4);
  scene.add(dirLight);

  const floorMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(40, 40),
    new THREE.MeshStandardMaterial({ color: 0x334466, transparent: true, opacity: 0.18, side: THREE.DoubleSide })
  );
  floorMesh.rotation.x = -Math.PI / 2;
  scene.add(floorMesh);

  createVersionLabel('Version 12');
  createMathTextbookAxes(10);

  const controllers = initControllers(renderer, rig);
  rightController = controllers.right;
  leftController  = controllers.left;

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
    onCreatePoint: (x, y, z) => { addFullPoint(x, y, z, 0xff0000); },

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
      if (allGeraden.length === 0) { setPanelStatus('Erst Gerade!', '#ff4444'); return; }
      if (appMode !== 'normal') cancelSelection();
      appMode = 'select-param-gerade';
      allGeraden.forEach(g => { g.marker.visible = true; });
      setPanelStatus('Gerade waehlen.', '#88ffff');
    },

    onLaengeMode: () => {
      if (appMode === 'select-vector-length') { cancelSelection(); return; }
      if (appMode !== 'normal') cancelSelection();
      enterLaengeMode();
    },

    onWinkelMode: () => {
      if (appMode === 'select-winkel-1' || appMode === 'select-winkel-2') { cancelSelection(); return; }
      if (appMode !== 'normal') cancelSelection();
      enterWinkelMode();
    },

    onSchnittMode: () => {
      if (appMode === 'select-schnitt-1' || appMode === 'select-schnitt-2') { cancelSelection(); return; }
      if (allGeraden.length < 2) { setPanelStatus('Mind. 2 Geraden!', '#ff4444'); return; }
      if (appMode !== 'normal') cancelSelection();
      appMode = 'select-schnitt-1';
      allGeraden.forEach(g => { g.marker.visible = true; });
      setPanelStatus('Gerade 1 waehlen', '#88ffff');
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

    onDeleteAll: () => { deleteAllObjects(); },

    onUndoLast: () => { undoLast(); },

    onToggleOrtsvektoren:     (v) => { ovVisible = v; toggleOrtsvektoren(v); },
    onToggleRichtungsvektor:  (v) => { rvVisible = v; richtungsvektorGroup.visible = v; },
    onToggleGeradengleichung: (v) => { ggVisible = v; geradengleichungGroup.visible = v; },
    onToggleGL:               (v) => { glVisible = v; geradenLinienGroup.visible = v; },
    onToggleBodenKS:          (v) => { ksVisible = v; bodenKSGroup.visible = v; },
    onToggleKoordinaten:      (v) => { koVisible = v; toggleKoordinaten(v); }
  });

  controllers.right.addEventListener('selectstart', () => {
    const hitUI = handleUISelection();
    if (!hitUI && appMode !== 'normal') handleRaycast(rightController);
  });

  initTeleport(renderer, scene, rig);
}

// ===== Full point with letter label =====

function addFullPoint(mx, my, mz, color = 0xff0000) {
  const mesh = createPoint(scene, my, mz, mx, color, color === 0xff0000 ? 0.05 : 0.07);
  const pd = { mesh, mathCoords: { x: mx, y: my, z: mz }, originalColor: color };
  allPointMeshes.push(pd);
  addOrtsvektorForPoint(mesh, mx, my, mz, pointCounter++);
  undoStack.push({ type: 'addPoint', pd });
  return mesh;
}

// ===== Undo =====

function undoLast() {
  if (undoStack.length === 0) {
    setPanelStatus('Nichts rueckgaengig', '#888888');
    return;
  }
  const action = undoStack.pop();
  cancelSelection();

  if (action.type === 'addPoint') {
    const { pd } = action;
    if (pd.mesh.userData.ortsvektor) {
      pd.mesh.userData.ortsvektor.parent?.remove(pd.mesh.userData.ortsvektor);
    }
    scene.remove(pd.mesh); // letter + koord sprite removed as children
    const idx = allPointMeshes.indexOf(pd);
    if (idx !== -1) allPointMeshes.splice(idx, 1);
    pointCounter = Math.max(0, pointCounter - 1);
    setPanelStatus('Punkt rueckgaengig', '#ffaa44');

  } else if (action.type === 'addGerade') {
    const { gd } = action;
    geradenLinienGroup.remove(gd.line);
    if (gd.rvArrow) richtungsvektorGroup.remove(gd.rvArrow);
    if (gd.rvLabel) richtungsvektorGroup.remove(gd.rvLabel);
    geradengleichungGroup.remove(gd.ggLabel);
    scene.remove(gd.marker);
    const idx = allGeraden.indexOf(gd);
    if (idx !== -1) allGeraden.splice(idx, 1);
    setPanelStatus('Gerade rueckgaengig', '#ffaa44');

  } else if (action.type === 'addVektor') {
    const { vd } = action;
    if (vd.arrow) richtungsvektorGroup.remove(vd.arrow);
    if (vd.label) richtungsvektorGroup.remove(vd.label);
    const idx = allVektoren.indexOf(vd);
    if (idx !== -1) allVektoren.splice(idx, 1);
    setPanelStatus('Vektor rueckgaengig', '#ffaa44');
  }
}

// ===== Delete all =====

function deleteAllObjects() {
  for (const pd of allPointMeshes) {
    scene.remove(pd.mesh);
  }
  allPointMeshes.length = 0;

  for (const g of allGeraden) {
    geradenLinienGroup.remove(g.line);
    if (g.rvArrow) richtungsvektorGroup.remove(g.rvArrow);
    if (g.rvLabel) richtungsvektorGroup.remove(g.rvLabel);
    geradengleichungGroup.remove(g.ggLabel);
    scene.remove(g.marker);
  }
  allGeraden.length = 0;

  for (const v of allVektoren) {
    if (v.arrow) richtungsvektorGroup.remove(v.arrow);
    if (v.label) richtungsvektorGroup.remove(v.label);
  }
  allVektoren.length = 0;

  clearAllVectorUI();
  clearLaengeMarkers();
  clearWinkelMarkers();
  undoStack.length = 0;
  pointCounter = 0;
  cancelSelection();
}

// ===== LAENGE-Modus =====

function enterLaengeMode() {
  const total = allPointMeshes.length + allVektoren.length + allGeraden.length;
  if (total === 0) { setPanelStatus('Keine Vektoren!', '#ff4444'); return; }

  for (const pd of allPointMeshes) {
    const c = pd.mathCoords;
    const len = Math.sqrt(c.x**2 + c.y**2 + c.z**2);
    const marker = new THREE.Mesh(
      new THREE.SphereGeometry(0.07, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xffff00 })
    );
    marker.position.set(c.y, c.z, c.x);
    scene.add(marker);
    laengeMarkers.push({ mesh: marker, lengthValue: len });
  }

  for (const v of allVektoren) {
    if (!v.p1Math || !v.p2Math) continue;
    const d = { x: v.p2Math.x - v.p1Math.x, y: v.p2Math.y - v.p1Math.y, z: v.p2Math.z - v.p1Math.z };
    const len = Math.sqrt(d.x**2 + d.y**2 + d.z**2);
    const marker = new THREE.Mesh(
      new THREE.SphereGeometry(0.07, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xffff00 })
    );
    marker.position.set(v.p2Math.y, v.p2Math.z, v.p2Math.x);
    scene.add(marker);
    laengeMarkers.push({ mesh: marker, lengthValue: len });
  }

  for (const g of allGeraden) {
    const d = { x: g.p2Math.x - g.p1Math.x, y: g.p2Math.y - g.p1Math.y, z: g.p2Math.z - g.p1Math.z };
    const len = Math.sqrt(d.x**2 + d.y**2 + d.z**2);
    const marker = new THREE.Mesh(
      new THREE.SphereGeometry(0.07, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xffff00 })
    );
    marker.position.set(g.p2Math.y, g.p2Math.z, g.p2Math.x);
    scene.add(marker);
    laengeMarkers.push({ mesh: marker, lengthValue: len });
  }

  appMode = 'select-vector-length';
  setPanelStatus('Vektorspitze waehlen', '#ffff00');
}

function clearLaengeMarkers() {
  laengeMarkers.forEach(m => scene.remove(m.mesh));
  laengeMarkers.length = 0;
}

// ===== WINKEL-Modus =====

function enterWinkelMode() {
  const total = allPointMeshes.length + allVektoren.length + allGeraden.length;
  if (total < 2) { setPanelStatus('Mind. 2 Vektoren!', '#ff4444'); return; }

  for (const pd of allPointMeshes) {
    const c = pd.mathCoords;
    const marker = new THREE.Mesh(
      new THREE.SphereGeometry(0.07, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xffff00 })
    );
    marker.position.set(c.y, c.z, c.x);
    scene.add(marker);
    winkelMarkers.push({ mesh: marker, dir: { x: c.x, y: c.y, z: c.z } });
  }

  for (const v of allVektoren) {
    if (!v.p1Math || !v.p2Math) continue;
    const dir = { x: v.p2Math.x - v.p1Math.x, y: v.p2Math.y - v.p1Math.y, z: v.p2Math.z - v.p1Math.z };
    const marker = new THREE.Mesh(
      new THREE.SphereGeometry(0.07, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xffff00 })
    );
    marker.position.set(v.p2Math.y, v.p2Math.z, v.p2Math.x);
    scene.add(marker);
    winkelMarkers.push({ mesh: marker, dir });
  }

  for (const g of allGeraden) {
    const dir = { x: g.p2Math.x - g.p1Math.x, y: g.p2Math.y - g.p1Math.y, z: g.p2Math.z - g.p1Math.z };
    const marker = new THREE.Mesh(
      new THREE.SphereGeometry(0.07, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xffff00 })
    );
    marker.position.set(g.p2Math.y, g.p2Math.z, g.p2Math.x);
    scene.add(marker);
    winkelMarkers.push({ mesh: marker, dir });
  }

  appMode = 'select-winkel-1';
  setPanelStatus('Vektor 1 waehlen', '#ffff00');
}

function clearWinkelMarkers() {
  winkelMarkers.forEach(m => scene.remove(m.mesh));
  winkelMarkers.length = 0;
  selectedWinkelDir1 = null;
}

// ===== Schnittpunkt Berechnung =====

function dotV(a, b) { return a.x * b.x + a.y * b.y + a.z * b.z; }

function computeSchnitt(g1, g2) {
  const P1 = g1.p1Math;
  const D1 = { x: g1.p2Math.x - P1.x, y: g1.p2Math.y - P1.y, z: g1.p2Math.z - P1.z };
  const P2 = g2.p1Math;
  const D2 = { x: g2.p2Math.x - P2.x, y: g2.p2Math.y - P2.y, z: g2.p2Math.z - P2.z };

  const w = { x: P1.x - P2.x, y: P1.y - P2.y, z: P1.z - P2.z };
  const a = dotV(D1, D1);
  const b = dotV(D1, D2);
  const c = dotV(D2, D2);
  const d = dotV(D1, w);
  const e = dotV(D2, w);
  const denom = a * c - b * b;

  if (Math.abs(denom) < 0.0001) return { type: 'parallel' };

  const t = (b * e - c * d) / denom;
  const s = (a * e - b * d) / denom;

  const Q1 = { x: P1.x + t * D1.x, y: P1.y + t * D1.y, z: P1.z + t * D1.z };
  const Q2 = { x: P2.x + s * D2.x, y: P2.y + s * D2.y, z: P2.z + s * D2.z };

  const dist = Math.sqrt((Q1.x - Q2.x)**2 + (Q1.y - Q2.y)**2 + (Q1.z - Q2.z)**2);
  if (dist > 0.05) return { type: 'skew' };

  return {
    type: 'intersection',
    point: {
      x: Math.round(((Q1.x + Q2.x) / 2) * 100) / 100,
      y: Math.round(((Q1.y + Q2.y) / 2) * 100) / 100,
      z: Math.round(((Q1.z + Q2.z) / 2) * 100) / 100
    }
  };
}

// ===== Raycast handler =====

function handleRaycast(ctrl) {
  if (!ctrl) return;

  pointTempMatrix.identity().extractRotation(ctrl.matrixWorld);
  pointRaycaster.ray.origin.setFromMatrixPosition(ctrl.matrixWorld);
  pointRaycaster.ray.direction.set(0, 0, -1).applyMatrix4(pointTempMatrix);
  pointRaycaster.far = 20;

  // --- Point-selection modes ---
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
      const vd = { arrow, label, p1Math: { ...p1 }, p2Math: { ...p2 } };
      allVektoren.push(vd);
      undoStack.push({ type: 'addVektor', vd });
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
      const gd = { line, rvArrow, rvLabel, ggLabel, marker, p1Math: { ...p1 }, p2Math: { ...p2 } };
      allGeraden.push(gd);
      undoStack.push({ type: 'addGerade', gd });
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

  // --- Gerade-marker modes (delete, param, schnitt) ---
  } else if (
    appMode === 'select-delete-gerade' || appMode === 'select-param-gerade' ||
    appMode === 'select-schnitt-1'     || appMode === 'select-schnitt-2'
  ) {
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
      allGeraden.forEach(g => { g.marker.visible = false; });
      appMode = 'normal';
      setPanelStatus('Bereit');

    } else if (appMode === 'select-param-gerade') {
      const lambda = getLambdaValue();
      const OV = geradeData.p1Math;
      const RV = { x: geradeData.p2Math.x - OV.x, y: geradeData.p2Math.y - OV.y, z: geradeData.p2Math.z - OV.z };
      addFullPoint(OV.x + lambda * RV.x, OV.y + lambda * RV.y, OV.z + lambda * RV.z, 0x44aaff);
      allGeraden.forEach(g => { g.marker.visible = false; });
      appMode = 'normal';
      setPanelStatus('Bereit');

    } else if (appMode === 'select-schnitt-1') {
      selectedGerade1 = geradeData;
      geradeData.marker.material.color.setHex(0x00ffff); // highlight selected
      appMode = 'select-schnitt-2';
      setPanelStatus('Gerade 2 waehlen', '#88ffff');

    } else if (appMode === 'select-schnitt-2') {
      if (geradeData === selectedGerade1) return; // ignore same gerade
      const result = computeSchnitt(selectedGerade1, geradeData);
      // restore marker
      selectedGerade1.marker.material.color.setHex(0xffff00);
      allGeraden.forEach(g => { g.marker.visible = false; });
      selectedGerade1 = null;
      appMode = 'normal';

      if (result.type === 'intersection') {
        const p = result.point;
        addFullPoint(p.x, p.y, p.z, 0x44aaff);
        setPanelStatus('Schnittpunkt!', '#44ffff');
      } else if (result.type === 'parallel') {
        setPanelStatus('Parallel!', '#ff8800');
        setTimeout(() => setPanelStatus('Bereit'), 3000);
      } else {
        setPanelStatus('Windschief!', '#ff8800');
        setTimeout(() => setPanelStatus('Bereit'), 3000);
      }
    }

  // --- LAENGE mode ---
  } else if (appMode === 'select-vector-length') {
    const meshes = laengeMarkers.map(m => m.mesh);
    const hits = pointRaycaster.intersectObjects(meshes, false);
    if (!hits.length) return;
    const data = laengeMarkers.find(m => m.mesh === hits[0].object);
    if (!data) return;
    const rounded = Math.round(data.lengthValue * 100) / 100;
    setPanelStatus(`|u| = ${rounded}`, '#ffff00');
    clearLaengeMarkers();
    appMode = 'normal';

  // --- WINKEL mode ---
  } else if (appMode === 'select-winkel-1' || appMode === 'select-winkel-2') {
    const meshes = winkelMarkers.map(m => m.mesh);
    const hits = pointRaycaster.intersectObjects(meshes, false);
    if (!hits.length) return;
    const wm = winkelMarkers.find(m => m.mesh === hits[0].object);
    if (!wm) return;

    if (appMode === 'select-winkel-1') {
      selectedWinkelDir1 = wm.dir;
      wm.mesh.material.color.setHex(0x00ffff); // highlight first
      appMode = 'select-winkel-2';
      setPanelStatus('Vektor 2 waehlen', '#88ffff');

    } else {
      const v1 = selectedWinkelDir1, v2 = wm.dir;
      const len1 = Math.sqrt(v1.x**2 + v1.y**2 + v1.z**2);
      const len2 = Math.sqrt(v2.x**2 + v2.y**2 + v2.z**2);
      if (len1 < 0.001 || len2 < 0.001) {
        setPanelStatus('Nullvektor!', '#ff4444');
      } else {
        const cosA = Math.max(-1, Math.min(1, dotV(v1, v2) / (len1 * len2)));
        const angle = Math.round(Math.acos(cosA) * 180 / Math.PI * 10) / 10;
        setPanelStatus(`Winkel: ${angle} Grad`, '#88ffff');
      }
      clearWinkelMarkers();
      appMode = 'normal';
    }
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
  if (selectedGerade1) {
    selectedGerade1.marker.material.color.setHex(0xffff00);
    selectedGerade1 = null;
  }
  allGeraden.forEach(g => { g.marker.visible = false; });
  clearLaengeMarkers();
  clearWinkelMarkers();
  appMode = 'normal';
  setPanelStatus('Bereit');
}

// ===== Scene helpers =====

function createBodenKSLabels() {
  const group = new THREE.Group();
  group.visible = false;
  for (let tX = -10; tX <= 10; tX++) {
    for (let tZ = -10; tZ <= 10; tZ++) {
      if (tX === 0 || tZ === 0) continue;
      const text = `(${tZ}/${tX})`;
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
  return mesh;
}

function animate() {
  renderer.setAnimationLoop(() => {
    updateControllers();
    updateTeleport();
    renderer.render(scene, camera);
  });
}
