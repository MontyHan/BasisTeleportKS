import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

let scene, camera, rig, leftController, rightController;

const raycaster = new THREE.Raycaster();
const tempMatrix = new THREE.Matrix4();

const buttons = [];
const values = { x: 0, y: 0, z: 0 };
const textSprites = {};

let panelRoot = null;
let statusSprite = null;
let helpGroup = null;
let helpVisible = false;

let onCreatePoint = null;
let onGeradeMode = null;
let onDeleteMode = null;
let onToggleOrtsvektoren = null;
let onToggleRichtungsvektor = null;
let onToggleGeradengleichung = null;

let ortsvektorenVisible = false;
let richtungsvektorVisible = false;
let geradengleichungVisible = false;
let ovToggleBtn = null;
let rvToggleBtn = null;
let ggToggleBtn = null;

export function initInputUI(s, cam, r, lCtrl, rCtrl, options = {}) {
  scene = s;
  camera = cam;
  rig = r;
  leftController = lCtrl;
  rightController = rCtrl;

  onCreatePoint           = options.onCreatePoint           ?? null;
  onGeradeMode            = options.onGeradeMode            ?? null;
  onDeleteMode            = options.onDeleteMode            ?? null;
  onToggleOrtsvektoren    = options.onToggleOrtsvektoren    ?? null;
  onToggleRichtungsvektor = options.onToggleRichtungsvektor ?? null;
  onToggleGeradengleichung = options.onToggleGeradengleichung ?? null;

  createPanel();
  createHelpPanel();
}

export function setPanelStatus(text, color = 'white') {
  if (!statusSprite?.material?.map?.image) return;
  const canvas = statusSprite.material.map.image;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = color;
  ctx.font = 'bold 46px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);
  statusSprite.material.map.needsUpdate = true;
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

  // Status-Zeile
  statusSprite = makeTextSprite('Bereit', 46);
  statusSprite.position.set(0, -1.05, 0);
  statusSprite.scale.set(0.9, 0.3, 1);
  panelRoot.add(statusSprite);

  // Aktions-Buttons (alle wide, 56px)
  addWide('Punkt erzeugen', 0, -1.45, () => {
    if (onCreatePoint) onCreatePoint(values.x, values.y, values.z);
  });

  addWide('GERADE', 0, -1.9, () => {
    if (onGeradeMode) onGeradeMode();
  });

  addWide('LOESCHEN', 0, -2.35, () => {
    if (onDeleteMode) onDeleteMode();
  });

  // Toggle-Buttons nebeneinander (OV / RV / GG) — medium, 56px
  ovToggleBtn = addMedium('OV:AUS', -0.35, -2.8, () => {
    ortsvektorenVisible = !ortsvektorenVisible;
    if (onToggleOrtsvektoren) onToggleOrtsvektoren(ortsvektorenVisible);
    updateButtonLabel(ovToggleBtn, ortsvektorenVisible ? 'OV:AN' : 'OV:AUS', ortsvektorenVisible);
  });

  rvToggleBtn = addMedium('RV:AUS', 0.0, -2.8, () => {
    richtungsvektorVisible = !richtungsvektorVisible;
    if (onToggleRichtungsvektor) onToggleRichtungsvektor(richtungsvektorVisible);
    updateButtonLabel(rvToggleBtn, richtungsvektorVisible ? 'RV:AN' : 'RV:AUS', richtungsvektorVisible);
  });

  ggToggleBtn = addMedium('GG:AUS', 0.35, -2.8, () => {
    geradengleichungVisible = !geradengleichungVisible;
    if (onToggleGeradengleichung) onToggleGeradengleichung(geradengleichungVisible);
    updateButtonLabel(ggToggleBtn, geradengleichungVisible ? 'GG:AN' : 'GG:AUS', geradengleichungVisible);
  });

  // Hilfe-Toggle
  addWide('? HILFE', 0, -3.25, () => {
    helpVisible = !helpVisible;
    if (helpGroup) helpGroup.visible = helpVisible;
  });
}

// ===== Button-Fabriken =====

function addWide(label, x, y, onClick) {
  const btn = makeWideButton(label, x, y, onClick);
  panelRoot.add(btn);
  buttons.push(btn);
  return btn;
}

function addMedium(label, x, y, onClick) {
  const btn = makeMediumButton(label, x, y, onClick);
  panelRoot.add(btn);
  buttons.push(btn);
  return btn;
}

function makeWideButton(label, x, y, onClick) {
  const geo = new THREE.BoxGeometry(0.4, 0.2, 0.05);
  const mat = new THREE.MeshBasicMaterial({ color: 0x4444ff });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(x, y, 0);
  mesh.userData.onClick = onClick;
  mesh.userData.fontSize = 56;
  const spr = makeTextSprite(label, 56);
  spr.position.set(0, 0, 0.06);
  spr.scale.set(0.4, 0.2, 1);
  mesh.add(spr);
  return mesh;
}

function makeMediumButton(label, x, y, onClick) {
  // 0.3 breit × 0.2 hoch, canvas 384×256 (1.5:1 = 0.3:0.2) für korrekte Proportionen
  const geo = new THREE.BoxGeometry(0.3, 0.2, 0.05);
  const mat = new THREE.MeshBasicMaterial({ color: 0x4444ff });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(x, y, 0);
  mesh.userData.onClick = onClick;
  mesh.userData.fontSize = 52;

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = 384;
  canvas.height = 256;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = 'rgba(255,255,255,1)';
  ctx.font = 'bold 52px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, canvas.width / 2, canvas.height / 2);
  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true }));
  spr.position.set(0, 0, 0.06);
  spr.scale.set(0.3, 0.2, 1);
  mesh.add(spr);
  return mesh;
}

function updateButtonLabel(btn, label, active) {
  if (!btn) return;
  btn.material.color.setHex(active ? 0x44aa44 : 0x4444ff);
  const sprite = btn.children[0];
  if (!sprite?.material?.map?.image) return;
  const fs = btn.userData.fontSize || 56;
  const canvas = sprite.material.map.image;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = 'rgba(255,255,255,1)';
  ctx.font = `bold ${fs}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, canvas.width / 2, canvas.height / 2);
  sprite.material.map.needsUpdate = true;
}

// ===== Koordinaten-Zeilen =====

function createRow(parent, axis, y) {
  const text = makeTextSprite(`${axis}: 0`);
  text.position.set(-0.5, y, 0);
  parent.add(text);
  textSprites[axis] = text;

  const minus = makeSmallButton('-', 0.2,  y, () => { values[axis] -= 1; updateText(); });
  const plus  = makeSmallButton('+', 0.45, y, () => { values[axis] += 1; updateText(); });
  parent.add(plus, minus);
  buttons.push(plus, minus);
}

function updateText() {
  for (const axis in textSprites) {
    const newSprite = makeTextSprite(`${axis}: ${values[axis]}`);
    newSprite.position.copy(textSprites[axis].position);
    const old = textSprites[axis];
    if (old.parent) old.parent.remove(old);
    old.material.map?.dispose();
    old.material.dispose();
    textSprites[axis] = newSprite;
    panelRoot.add(newSprite);
  }
}

function makeSmallButton(label, x, y, onClick) {
  const geo = new THREE.BoxGeometry(0.2, 0.2, 0.05);
  const mat = new THREE.MeshBasicMaterial({ color: 0x4444ff });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(x, y, 0);
  mesh.userData.onClick = onClick;
  mesh.userData.fontSize = 56;
  const spr = makeTextSprite(label, 56);
  spr.position.set(0, 0, 0.06);
  spr.scale.set(0.2, 0.2, 1);
  mesh.add(spr);
  return mesh;
}

function makeTextSprite(text, fontSize = 56) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = 512;
  canvas.height = 256;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = 'rgba(255,255,255,1)';
  ctx.font = `bold ${fontSize}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);
  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true }));
  sprite.scale.set(0.75, 0.35, 1);
  return sprite;
}

// ===== Hilfe-Panel =====

function createHelpPanel() {
  helpGroup = new THREE.Group();
  helpGroup.visible = false;
  helpGroup.position.set(0.65, 0.1, -0.3);
  helpGroup.rotation.x = -Math.PI / 8;
  helpGroup.scale.set(0.15, 0.15, 0.15);
  leftController.add(helpGroup);

  const lines = [
    '-- HILFE --',
    'Punkt: x/y/z eingeben',
    '→ [Punkt erzeugen]',
    '',
    'Gerade: [GERADE]',
    '→ 2 Punkte mit Ray',
    '',
    'Loeschen: [LOESCHEN]',
    '→ Punkt mit Ray',
    '',
    'OV / RV / GG:',
    'Vektoren/Gleichung AN/AUS',
  ];

  let row = 0;
  for (const line of lines) {
    if (line === '') { row++; continue; }
    const sprite = makeHelpSprite(line);
    sprite.position.set(0.45, -row * 0.38, 0);
    helpGroup.add(sprite);
    row++;
  }
}

function makeHelpSprite(text) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = 512;
  canvas.height = 110;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = 'rgba(180,220,255,1)';
  ctx.font = 'bold 48px Arial';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 10, canvas.height / 2);
  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true }));
  sprite.scale.set(1.05, 0.32, 1);
  return sprite;
}

// ===== Interaktion =====

export function handleUISelection() {
  if (!rightController || !buttons.length) return false;

  tempMatrix.identity().extractRotation(rightController.matrixWorld);
  raycaster.ray.origin.setFromMatrixPosition(rightController.matrixWorld);
  raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);
  raycaster.far = 5;

  const intersects = raycaster.intersectObjects(buttons, false);
  if (!intersects.length) return false;

  const cb = intersects[0].object?.userData?.onClick;
  if (typeof cb === 'function') { cb(); return true; }
  return false;
}
