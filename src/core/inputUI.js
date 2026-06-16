import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

let scene, camera, rig, leftController, rightController;

const raycaster = new THREE.Raycaster();
const tempMatrix = new THREE.Matrix4();

const buttons = [];
const values = { x: 0, y: 0, z: 0 };
const textSprites = {};

let panelRoot = null;
let onCreatePoint = null;
let onCreateGerade = null;
let onToggleOrtsvektoren = null;
let onToggleRichtungsvektor = null;

let ortsvektorenVisible = false;
let richtungsvektorVisible = false;
let ovToggleBtn = null;
let rvToggleBtn = null;

export function initInputUI(s, cam, r, lCtrl, rCtrl, options = {}) {
  scene = s;
  camera = cam;
  rig = r;
  leftController = lCtrl;
  rightController = rCtrl;

  onCreatePoint         = options.onCreatePoint         ?? null;
  onCreateGerade        = options.onCreateGerade        ?? null;
  onToggleOrtsvektoren  = options.onToggleOrtsvektoren  ?? null;
  onToggleRichtungsvektor = options.onToggleRichtungsvektor ?? null;

  createPanel();
}

function createPanel() {
  panelRoot = new THREE.Group();
  panelRoot.position.set(0, 0.1, -0.3);
  panelRoot.rotation.x = -Math.PI / 8;
  panelRoot.scale.set(0.15, 0.15, 0.15);
  leftController.add(panelRoot);

  createRow(panelRoot, 'x', 0);
  createRow(panelRoot, 'y', -0.4);
  createRow(panelRoot, 'z', -0.8);

  // Punkt erstellen
  const createBtn = makeWideButton('CREATE', 0, -1.4, () => {
    if (onCreatePoint) onCreatePoint(values.x, values.y, values.z);
  });
  panelRoot.add(createBtn);
  buttons.push(createBtn);

  // Gerade durch die letzten 2 Punkte
  const geradeBtn = makeWideButton('GERADE', 0, -1.9, () => {
    if (onCreateGerade) onCreateGerade();
  });
  panelRoot.add(geradeBtn);
  buttons.push(geradeBtn);

  // Toggle Ortsvektoren
  ovToggleBtn = makeWideButton('OV: AUS', 0, -2.4, () => {
    ortsvektorenVisible = !ortsvektorenVisible;
    if (onToggleOrtsvektoren) onToggleOrtsvektoren(ortsvektorenVisible);
    updateButtonLabel(ovToggleBtn, ortsvektorenVisible ? 'OV: AN' : 'OV: AUS', ortsvektorenVisible);
  });
  panelRoot.add(ovToggleBtn);
  buttons.push(ovToggleBtn);

  // Toggle Richtungsvektoren
  rvToggleBtn = makeWideButton('RV: AUS', 0, -2.9, () => {
    richtungsvektorVisible = !richtungsvektorVisible;
    if (onToggleRichtungsvektor) onToggleRichtungsvektor(richtungsvektorVisible);
    updateButtonLabel(rvToggleBtn, richtungsvektorVisible ? 'RV: AN' : 'RV: AUS', richtungsvektorVisible);
  });
  panelRoot.add(rvToggleBtn);
  buttons.push(rvToggleBtn);
}

function updateButtonLabel(btn, label, active) {
  if (!btn) return;
  btn.material.color.setHex(active ? 0x44aa44 : 0x4444ff);
  const sprite = btn.children[0];
  if (!sprite?.material?.map?.image) return;
  const canvas = sprite.material.map.image;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = 'rgba(255,255,255,1)';
  ctx.font = 'bold 56px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, canvas.width / 2, canvas.height / 2);
  sprite.material.map.needsUpdate = true;
}

function createRow(parent, axis, y) {
  const text = makeTextSprite(`${axis}: 0`);
  text.position.set(-0.5, y, 0);
  parent.add(text);

  textSprites[axis] = text;

  const minus = makeButton('-', 0.2, y, () => {
    values[axis] -= 1;
    updateText();
  });

  const plus = makeButton('+', 0.45, y, () => {
    values[axis] += 1;
    updateText();
  });

  parent.add(plus, minus);
  buttons.push(plus, minus);
}

function updateText() {
  for (const axis in textSprites) {
    const newSprite = makeTextSprite(`${axis}: ${values[axis]}`);
    newSprite.position.copy(textSprites[axis].position);

    const old = textSprites[axis];
    if (old.parent) old.parent.remove(old);

    textSprites[axis].material.map?.dispose();
    textSprites[axis].material.dispose();

    textSprites[axis] = newSprite;
    panelRoot.add(newSprite);
  }
}

function makeButton(label, x, y, onClick) {
  const geo = new THREE.BoxGeometry(0.2, 0.2, 0.05);
  const mat = new THREE.MeshBasicMaterial({ color: 0x4444ff });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(x, y, 0);
  mesh.userData.onClick = onClick;
  mesh.userData.label = label;
  const spr = makeTextSprite(label);
  spr.position.set(0, 0, 0.06);
  spr.scale.set(0.2, 0.2, 1);
  mesh.add(spr);
  return mesh;
}

function makeWideButton(label, x, y, onClick) {
  const geo = new THREE.BoxGeometry(0.4, 0.2, 0.05);
  const mat = new THREE.MeshBasicMaterial({ color: 0x4444ff });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(x, y, 0);
  mesh.userData.onClick = onClick;
  mesh.userData.label = label;
  const spr = makeTextSprite(label);
  spr.position.set(0, 0, 0.06);
  spr.scale.set(0.4, 0.2, 1);
  mesh.add(spr);
  return mesh;
}

function makeTextSprite(text) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = 512;
  canvas.height = 256;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = 'rgba(255,255,255,1)';
  ctx.font = 'bold 56px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);
  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  const mat = new THREE.SpriteMaterial({ map: texture, transparent: true });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(0.75, 0.35, 1);
  return sprite;
}

// ===== Interaktion =====

export function handleUISelection() {
  if (!rightController) return;
  if (!buttons.length) return;

  tempMatrix.identity().extractRotation(rightController.matrixWorld);

  const origin = raycaster.ray.origin;
  const dir = raycaster.ray.direction;

  origin.setFromMatrixPosition(rightController.matrixWorld);
  dir.set(0, 0, -1).applyMatrix4(tempMatrix);

  raycaster.set(origin, dir);
  raycaster.far = 5;

  const intersects = raycaster.intersectObjects(buttons, false);
  if (!intersects.length) return;

  const obj = intersects[0].object;
  const cb = obj?.userData?.onClick;
  if (typeof cb === 'function') cb();
}
