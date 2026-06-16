import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { initXR } from './core/xr.js';
import { initControllers, updateControllers } from './core/controllers.js';
import { initTeleport, updateTeleport } from './core/teleport.js';
import { initGrid } from './core/grid.js';

import { initInputUI, handleUISelection, setPanelStatus } from './core/inputUI.js';
import { initVectorUI, setVectorFromComponents, addOrtsvektorForPoint, toggleOrtsvektoren } from './core/vectorUI.js';
import { createPoint, createGerade, createRichtungsvektor } from './core/geometryFactory.js';

let scene, camera, renderer;
let rig;
let rightController;

let pointCounter = 0;
const allPointMeshes = []; // { mesh, mathCoords: {x,y,z}, originalColor }

let appMode = 'normal'; // 'normal' | 'select-gerade-1' | 'select-gerade-2' | 'select-delete'
let selectedP1 = null;  // { mesh, mathCoords, originalColor }

let richtungsvektorGroup;

const pointRaycaster = new THREE.Raycaster();
const pointTempMatrix = new THREE.Matrix4();

init();
animate();

function init() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x202040);

  rig = new THREE.Group();
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

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(40, 40),
    new THREE.MeshStandardMaterial({ color: 0x222222 })
  );
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);

  createVersionLabel('Version 3');
  createMathTextbookAxes(10);

  const controllers = initControllers(renderer, rig);
  rightController = controllers.right;

  // Gruppe für Richtungsvektoren (initial unsichtbar)
  richtungsvektorGroup = new THREE.Group();
  richtungsvektorGroup.visible = false;
  scene.add(richtungsvektorGroup);

  initVectorUI(scene);

  initInputUI(scene, camera, rig, controllers.left, controllers.right, {
    onCreatePoint: (x, y, z) => {
      // Koordinaten-Konvertierung Mathebuch → Three.js: (x,y,z) → (y,z,x)
      const mesh = createPoint(scene, y, z, x, 0xff0000, 0.05);
      allPointMeshes.push({ mesh, mathCoords: { x, y, z }, originalColor: 0xff0000 });

      addOrtsvektorForPoint(mesh, x, y, z, pointCounter++);

      setVectorFromComponents(x, y, z, { lineColor: 0x00ffcc, pointColor: 0x00ff00 });
    },

    onGeradeMode: () => {
      // Toggle: erneuter Druck bricht ab
      if (appMode === 'select-gerade-1' || appMode === 'select-gerade-2') {
        cancelSelection();
        return;
      }
      // Laufenden Lösch-Modus abbrechen
      if (appMode === 'select-delete') cancelSelection();

      appMode = 'select-gerade-1';
      setPanelStatus('Punkt 1 waehlen...', '#ffff00');
    },

    onDeleteMode: () => {
      // Toggle: erneuter Druck bricht ab
      if (appMode === 'select-delete') {
        cancelSelection();
        return;
      }
      // Laufende Gerade-Auswahl abbrechen
      if (appMode !== 'normal') cancelSelection();

      appMode = 'select-delete';
      setPanelStatus('Punkt loeschen...', '#ff6666');
    },

    onToggleOrtsvektoren: (visible) => {
      toggleOrtsvektoren(visible);
    },

    onToggleRichtungsvektor: (visible) => {
      richtungsvektorGroup.visible = visible;
    }
  });

  // Rechter Controller: erst UI-Buttons prüfen, dann Punkt-Raycast
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

  const meshes = allPointMeshes.map(p => p.mesh);
  const intersects = pointRaycaster.intersectObjects(meshes, false);
  if (!intersects.length) return;

  const hitMesh = intersects[0].object;
  const pointData = allPointMeshes.find(p => p.mesh === hitMesh);
  if (!pointData) return;

  if (appMode === 'select-gerade-1') {
    selectedP1 = pointData;
    pointData.mesh.material.color.setHex(0xff8800); // Orange = ausgewählt
    appMode = 'select-gerade-2';
    setPanelStatus('Punkt 2 waehlen...', '#ffaa00');

  } else if (appMode === 'select-gerade-2') {
    const p1 = selectedP1.mathCoords;
    const p2 = pointData.mathCoords;
    createGerade(scene, p1, p2);
    createRichtungsvektor(richtungsvektorGroup, p1, p2);
    // Farbe von Punkt 1 zurücksetzen
    selectedP1.mesh.material.color.setHex(selectedP1.originalColor);
    selectedP1 = null;
    appMode = 'normal';
    setPanelStatus('Bereit');

  } else if (appMode === 'select-delete') {
    // Ortsvektor entfernen falls vorhanden
    if (pointData.mesh.userData.ortsvektor) {
      const ov = pointData.mesh.userData.ortsvektor;
      ov.parent?.remove(ov);
    }
    scene.remove(pointData.mesh);
    allPointMeshes.splice(allPointMeshes.indexOf(pointData), 1);
    appMode = 'normal';
    setPanelStatus('Bereit');
  }
}

function cancelSelection() {
  if (selectedP1) {
    selectedP1.mesh.material.color.setHex(selectedP1.originalColor);
    selectedP1 = null;
  }
  appMode = 'normal';
  setPanelStatus('Bereit');
}

function createMathTextbookAxes(length) {
  const axesGroup = new THREE.Group();

  const xGeometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,0,0), new THREE.Vector3(0,0,length)]);
  axesGroup.add(new THREE.Line(xGeometry, new THREE.LineBasicMaterial({ color: 0xff0000 })));
  axesGroup.add(new THREE.ArrowHelper(new THREE.Vector3(0,0,1), new THREE.Vector3(0,0,0), length, 0xff0000, length*0.2, length*0.1));

  const yGeometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,0,0), new THREE.Vector3(length,0,0)]);
  axesGroup.add(new THREE.Line(yGeometry, new THREE.LineBasicMaterial({ color: 0x00ff00 })));
  axesGroup.add(new THREE.ArrowHelper(new THREE.Vector3(1,0,0), new THREE.Vector3(0,0,0), length, 0x00ff00, length*0.2, length*0.1));

  const zGeometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,0,0), new THREE.Vector3(0,length,0)]);
  axesGroup.add(new THREE.Line(zGeometry, new THREE.LineBasicMaterial({ color: 0x0000ff })));
  axesGroup.add(new THREE.ArrowHelper(new THREE.Vector3(0,1,0), new THREE.Vector3(0,0,0), length, 0x0000ff, length*0.2, length*0.1));

  const labelGroup = new THREE.Group();
  addAxisLabel('X', new THREE.Vector3(0, 0, length + 0.5), labelGroup);
  addAxisLabel('Y', new THREE.Vector3(length + 0.5, 0, 0), labelGroup);
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
  mesh.position.set(0, 0.01, 3);
  scene.add(mesh);
}

function animate() {
  renderer.setAnimationLoop(() => {
    updateControllers();
    updateTeleport();
    renderer.render(scene, camera);
  });
}
