import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { initXR } from './core/xr.js';
import { initControllers, updateControllers } from './core/controllers.js';
import { initTeleport, updateTeleport } from './core/teleport.js';
import { initGrid } from './core/grid.js';

import { initInputUI, handleUISelection, setPanelStatus, getInputValues } from './core/inputUI.js';
import { initVectorUI, addOrtsvektorForPoint, toggleOrtsvektoren } from './core/vectorUI.js';
import { createPoint, createGerade, createRichtungsvektor, createGeradengleichungLabel } from './core/geometryFactory.js';

let scene, camera, renderer;
let rig;
let rightController;

let pointCounter = 0;
const allPointMeshes = []; // { mesh, mathCoords: {x,y,z}, originalColor }
const allGeraden = [];     // { line, rvArrow, rvLabel, ggLabel, marker, p1Math, p2Math }
const allVektoren = [];    // { arrow, label }
const allParamPoints = []; // THREE.Mesh — blaue Parameterpunkte

let appMode = 'normal';
// 'normal' | 'select-gerade-1' | 'select-gerade-2'
// | 'select-vektor-1' | 'select-vektor-2'
// | 'select-param-gerade'
// | 'select-delete-punkt' | 'select-delete-gerade'
let selectedP1 = null;

let richtungsvektorGroup;
let geradengleichungGroup;
let geradenLinienGroup;
let bodenKSGroup;

const pointRaycaster = new THREE.Raycaster();
const pointTempMatrix = new THREE.Matrix4();

init();
animate();

function init() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x202040);

  rig = new THREE.Group();
  rig.position.set(3, 0, 3); // Startposition math (3/3)
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

  // Durchscheinender Fußboden — Objekte im negativen z-Bereich (Mathebuch) bleiben sichtbar
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(40, 40),
    new THREE.MeshStandardMaterial({
      color: 0x334466,
      transparent: true,
      opacity: 0.18,
      side: THREE.DoubleSide
    })
  );
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);

  createVersionLabel('Version 7');
  createMathTextbookAxes(10);

  const controllers = initControllers(renderer, rig);
  rightController = controllers.right;

  richtungsvektorGroup = new THREE.Group();
  richtungsvektorGroup.visible = true; // RV standardmäßig sichtbar
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
      const mesh = createPoint(scene, y, z, x, 0xff0000, 0.05);
      allPointMeshes.push({ mesh, mathCoords: { x, y, z }, originalColor: 0xff0000 });
      addOrtsvektorForPoint(mesh, x, y, z, pointCounter++);
    },

    onGeradeMode: () => {
      if (appMode === 'select-gerade-1' || appMode === 'select-gerade-2') {
        cancelSelection();
      } else {
        if (appMode !== 'normal') cancelSelection();
        appMode = 'select-gerade-1';
        setPanelStatus('Punkt 1 waehlen...', '#ffff00');
      }
    },

    onVektorMode: () => {
      if (appMode === 'select-vektor-1' || appMode === 'select-vektor-2') {
        cancelSelection();
      } else {
        if (appMode !== 'normal') cancelSelection();
        appMode = 'select-vektor-1';
        setPanelStatus('Vekt. P1 waehlen...', '#ffff00');
      }
    },

    onParamMode: () => {
      if (appMode === 'select-param-gerade') {
        cancelSelection();
      } else {
        if (appMode !== 'normal') cancelSelection();
        if (allGeraden.length === 0) {
          setPanelStatus('Erst Gerade erstellen!', '#ff4444');
          return;
        }
        appMode = 'select-param-gerade';
        allGeraden.forEach(g => { g.marker.visible = true; });
        setPanelStatus('x=lambda. Gerade waehlen.', '#88ffff');
      }
    },

    onDeleteMode: (type) => {
      if (type === 'punkt') {
        if (appMode === 'select-delete-punkt') {
          cancelSelection();
        } else {
          if (appMode !== 'normal') cancelSelection();
          appMode = 'select-delete-punkt';
          setPanelStatus('Punkt loeschen...', '#ff6666');
        }
      } else if (type === 'gerade') {
        if (appMode === 'select-delete-gerade') {
          cancelSelection();
        } else {
          if (appMode !== 'normal') cancelSelection();
          appMode = 'select-delete-gerade';
          allGeraden.forEach(g => { g.marker.visible = true; });
          setPanelStatus('Gerade loeschen...', '#ff6666');
        }
      }
    },

    onToggleOrtsvektoren: (visible) => { toggleOrtsvektoren(visible); },
    onToggleRichtungsvektor: (visible) => { richtungsvektorGroup.visible = visible; },
    onToggleGeradengleichung: (visible) => { geradengleichungGroup.visible = visible; },
    onToggleGL: (visible) => { geradenLinienGroup.visible = visible; },
    onToggleBodenKS: (visible) => { bodenKSGroup.visible = visible; }
  });

  controllers.right.addEventListener('selectstart', () => {
    const hitUI = handleUISelection();
    if (!hitUI && appMode !== 'normal') {
      handlePointRaycast();
    }
  });

  initTeleport(renderer, scene, rig);
}

function handlePointRaycast() {
  if (!rightController) return;

  pointTempMatrix.identity().extractRotation(rightController.matrixWorld);
  pointRaycaster.ray.origin.setFromMatrixPosition(rightController.matrixWorld);
  pointRaycaster.ray.direction.set(0, 0, -1).applyMatrix4(pointTempMatrix);
  pointRaycaster.far = 20;

  // Modi die gegen Punkte raycasten
  if (
    appMode === 'select-gerade-1' ||
    appMode === 'select-gerade-2' ||
    appMode === 'select-vektor-1' ||
    appMode === 'select-vektor-2' ||
    appMode === 'select-delete-punkt'
  ) {
    const meshes = allPointMeshes.map(p => p.mesh);
    const intersects = pointRaycaster.intersectObjects(meshes, false);
    if (!intersects.length) return;

    const hitMesh = intersects[0].object;
    const pointData = allPointMeshes.find(p => p.mesh === hitMesh);
    if (!pointData) return;

    if (appMode === 'select-vektor-1') {
      selectedP1 = pointData;
      pointData.mesh.material.color.setHex(0xff8800);
      appMode = 'select-vektor-2';
      setPanelStatus('Vekt. P2 waehlen...', '#ffaa00');

    } else if (appMode === 'select-vektor-2') {
      const p1 = selectedP1.mathCoords;
      const p2 = pointData.mathCoords;
      const { arrow, label } = createRichtungsvektor(richtungsvektorGroup, p1, p2);
      allVektoren.push({ arrow, label });
      selectedP1.mesh.material.color.setHex(selectedP1.originalColor);
      selectedP1 = null;
      appMode = 'normal';
      setPanelStatus('Bereit');

    } else if (appMode === 'select-gerade-1') {
      selectedP1 = pointData;
      pointData.mesh.material.color.setHex(0xff8800);
      appMode = 'select-gerade-2';
      setPanelStatus('Punkt 2 waehlen...', '#ffaa00');

    } else if (appMode === 'select-gerade-2') {
      const p1 = selectedP1.mathCoords;
      const p2 = pointData.mathCoords;

      const line = createGerade(geradenLinienGroup, p1, p2);
      const { arrow: rvArrow, label: rvLabel } = createRichtungsvektor(richtungsvektorGroup, p1, p2);
      const ggLabel = createGeradengleichungLabel(p1, p2);
      geradengleichungGroup.add(ggLabel);

      // Lösch-Markierung (gelbe Kugel am Mittelpunkt)
      const midThree = new THREE.Vector3(
        (p1.y + p2.y) / 2,
        (p1.z + p2.z) / 2,
        (p1.x + p2.x) / 2
      );
      const marker = new THREE.Mesh(
        new THREE.SphereGeometry(0.07, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0xffff00 })
      );
      marker.position.copy(midThree);
      marker.visible = false;
      scene.add(marker);

      allGeraden.push({ line, rvArrow, rvLabel, ggLabel, marker, p1Math: { ...p1 }, p2Math: { ...p2 } });

      selectedP1.mesh.material.color.setHex(selectedP1.originalColor);
      selectedP1 = null;
      appMode = 'normal';
      setPanelStatus('Bereit');

    } else if (appMode === 'select-delete-punkt') {
      if (pointData.mesh.userData.ortsvektor) {
        pointData.mesh.userData.ortsvektor.parent?.remove(pointData.mesh.userData.ortsvektor);
      }
      scene.remove(pointData.mesh);
      allPointMeshes.splice(allPointMeshes.indexOf(pointData), 1);
      appMode = 'normal';
      setPanelStatus('Bereit');
    }

  // Modi die gegen Geraden-Marker raycasten
  } else if (appMode === 'select-delete-gerade' || appMode === 'select-param-gerade') {
    const markers = allGeraden.map(g => g.marker);
    const intersects = pointRaycaster.intersectObjects(markers, false);
    if (!intersects.length) return;

    const hitMarker = intersects[0].object;
    const geradeData = allGeraden.find(g => g.marker === hitMarker);
    if (!geradeData) return;

    if (appMode === 'select-delete-gerade') {
      geradenLinienGroup.remove(geradeData.line);
      if (geradeData.rvArrow) richtungsvektorGroup.remove(geradeData.rvArrow);
      if (geradeData.rvLabel) richtungsvektorGroup.remove(geradeData.rvLabel);
      geradengleichungGroup.remove(geradeData.ggLabel);
      scene.remove(geradeData.marker);
      allGeraden.splice(allGeraden.indexOf(geradeData), 1);

    } else if (appMode === 'select-param-gerade') {
      const lambda = getInputValues().x;
      const OV = geradeData.p1Math;
      const RV = {
        x: geradeData.p2Math.x - OV.x,
        y: geradeData.p2Math.y - OV.y,
        z: geradeData.p2Math.z - OV.z
      };
      // Punkt auf der Gerade: OV + λ·RV (Mathebuch-Koordinaten)
      const mp = {
        x: OV.x + lambda * RV.x,
        y: OV.y + lambda * RV.y,
        z: OV.z + lambda * RV.z
      };
      // Mathebuch (x,y,z) → Three.js (y,z,x)
      const paramMesh = createPoint(scene, mp.y, mp.z, mp.x, 0x44aaff, 0.07);
      allParamPoints.push(paramMesh);
    }

    allGeraden.forEach(g => { g.marker.visible = false; });
    appMode = 'normal';
    setPanelStatus('Bereit');
  }
}

function cancelSelection() {
  if (selectedP1) {
    selectedP1.mesh.material.color.setHex(selectedP1.originalColor);
    selectedP1 = null;
  }
  allGeraden.forEach(g => { g.marker.visible = false; });
  appMode = 'normal';
  setPanelStatus('Bereit');
}

function createBodenKSLabels() {
  const group = new THREE.Group();
  group.visible = false;

  for (let tX = -10; tX <= 10; tX++) {
    for (let tZ = -10; tZ <= 10; tZ++) {
      if (tX === 0 || tZ === 0) continue;
      const mathX = tZ; // Three.js Z = Mathebuch x
      const mathY = tX; // Three.js X = Mathebuch y
      const text = `(${mathX}/${mathY})`;

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = 128;
      canvas.height = 64;
      ctx.clearRect(0, 0, 128, 64);
      ctx.fillStyle = 'rgba(200,210,255,1)';
      ctx.font = 'bold 16px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
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
  const axesGroup = new THREE.Group();

  // x-Achse (Mathebuch) = Three.js Z, rot
  axesGroup.add(new THREE.ArrowHelper(
    new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0, 0),
    length, 0xff0000, length * 0.1, length * 0.05
  ));
  // y-Achse (Mathebuch) = Three.js X, grün
  axesGroup.add(new THREE.ArrowHelper(
    new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, 0),
    length, 0x00ff00, length * 0.1, length * 0.05
  ));
  // z-Achse (Mathebuch) = Three.js Y, blau
  axesGroup.add(new THREE.ArrowHelper(
    new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 0),
    length, 0x0000ff, length * 0.1, length * 0.05
  ));

  const labelGroup = new THREE.Group();
  // X und Y Labels 0.2 nach oben, damit sie lesbar über dem Boden schweben
  addAxisLabel('X', new THREE.Vector3(0, 0.2, length + 0.5), labelGroup);
  addAxisLabel('Y', new THREE.Vector3(length + 0.5, 0.2, 0), labelGroup);
  addAxisLabel('Z', new THREE.Vector3(0, length + 0.5, 0), labelGroup);
  axesGroup.add(labelGroup);

  scene.add(axesGroup);
}

function addAxisLabel(text, position, group) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = 256; canvas.height = 256;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = 'rgba(255,255,255,1)';
  ctx.font = 'bold 100px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);
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
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.font = 'bold 64px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(version, canvas.width / 2, canvas.height / 2);
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
