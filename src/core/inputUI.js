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
let onVektorMode = null;
let onParamMode = null;
let onDeleteMode = null;
let onToggleOrtsvektoren = null;
let onToggleRichtungsvektor = null;
let onToggleGeradengleichung = null;
let onToggleGL = null;
let onToggleBodenKS = null;

let ortsvektorenVisible = false;
let richtungsvektorVisible = true;  // RV startet sichtbar
let geradengleichungVisible = false;
let glVisible = true;
let ksVisible = false;

let ovToggleBtn = null;
let rvToggleBtn = null;
let ggToggleBtn = null;
let glToggleBtn = null;
let ksToggleBtn = null;

export function initInputUI(s, cam, r, lCtrl, rCtrl, options = {}) {
  scene = s;
  camera = cam;
  rig = r;
  leftController = lCtrl;
  rightController = rCtrl;

  onCreatePoint             = options.onCreatePoint             ?? null;
  onGeradeMode              = options.onGeradeMode              ?? null;
  onVektorMode              = options.onVektorMode              ?? null;
  onParamMode               = options.onParamMode               ?? null;
  onDeleteMode              = options.onDeleteMode              ?? null;
  onToggleOrtsvektoren      = options.onToggleOrtsvektoren      ?? null;
  onToggleRichtungsvektor   = options.onToggleRichtungsvektor   ?? null;
  onToggleGeradengleichung  = options.onToggleGeradengleichung  ?? null;
  onToggleGL                = options.onToggleGL                ?? null;
  onToggleBodenKS           = options.onToggleBodenKS           ?? null;

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

// Gibt aktuelle x/y/z-Werte zurück (für λ-Abfrage in PARAM-Modus)
export function getInputValues() {
  return { ...values };
}

function createPanel() {
  panelRoot = new THREE.Group();
  panelRoot.position.set(0, 0.18, -0.25); // höher am Controller befestigt
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

  // Aktions-Buttons
  addWide('Punkt erzeugen', 0, -1.45, () => {
    if (onCreatePoint) onCreatePoint(values.x, values.y, values.z);
  });

  // GERADE und VEKTOR nebeneinander
  addMedium('GERADE', -0.2, -1.9, () => {
    if (onGeradeMode) onGeradeMode();
  });
  addMedium('VEKTOR', 0.2, -1.9, () => {
    if (onVektorMode) onVektorMode();
  });

  // PARAM: Punkt auf Gerade mit x als λ
  addWide('PARAM (x=λ)', 0, -2.35, () => {
    if (onParamMode) onParamMode();
  });

  // LOESCHEN: P-DEL und G-DEL
  addMedium('P-DEL', -0.2, -2.8, () => {
    if (onDeleteMode) onDeleteMode('punkt');
  });
  addMedium('G-DEL', 0.2, -2.8, () => {
    if (onDeleteMode) onDeleteMode('gerade');
  });

  // Toggle-Reihe 1: OV / RV / GG
  ovToggleBtn = addMedium('OV:AUS', -0.35, -3.25, () => {
    ortsvektorenVisible = !ortsvektorenVisible;
    if (onToggleOrtsvektoren) onToggleOrtsvektoren(ortsvektorenVisible);
    updateButtonLabel(ovToggleBtn, ortsvektorenVisible ? 'OV:AN' : 'OV:AUS', ortsvektorenVisible);
  });

  rvToggleBtn = addMedium('RV:AN', 0.0, -3.25, () => {
    richtungsvektorVisible = !richtungsvektorVisible;
    if (onToggleRichtungsvektor) onToggleRichtungsvektor(richtungsvektorVisible);
    updateButtonLabel(rvToggleBtn, richtungsvektorVisible ? 'RV:AN' : 'RV:AUS', richtungsvektorVisible);
  });
  rvToggleBtn.material.color.setHex(0x44aa44); // startet grün (AN)

  ggToggleBtn = addMedium('GG:AUS', 0.35, -3.25, () => {
    geradengleichungVisible = !geradengleichungVisible;
    if (onToggleGeradengleichung) onToggleGeradengleichung(geradengleichungVisible);
    updateButtonLabel(ggToggleBtn, geradengleichungVisible ? 'GG:AN' : 'GG:AUS', geradengleichungVisible);
  });

  // Toggle-Reihe 2: GL / KS
  glToggleBtn = addMedium('GL:AN', -0.2, -3.7, () => {
    glVisible = !glVisible;
    if (onToggleGL) onToggleGL(glVisible);
    updateButtonLabel(glToggleBtn, glVisible ? 'GL:AN' : 'GL:AUS', glVisible);
  });
  glToggleBtn.material.color.setHex(0x44aa44); // startet grün (AN)

  ksToggleBtn = addMedium('KS:AUS', 0.2, -3.7, () => {
    ksVisible = !ksVisible;
    if (onToggleBodenKS) onToggleBodenKS(ksVisible);
    updateButtonLabel(ksToggleBtn, ksVisible ? 'KS:AN' : 'KS:AUS', ksVisible);
  });

  // Hilfe
  addWide('? HILFE', 0, -4.15, () => {
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
  mesh.userData.fontSize = 80;

  // Quadratisches Canvas (256×256) passend zum quadratischen Button (0.2×0.2)
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = 256;
  canvas.height = 256;
  ctx.clearRect(0, 0, 256, 256);
  ctx.fillStyle = 'rgba(255,255,255,1)';
  ctx.font = 'bold 80px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, 128, 128);
  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true }));
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
  helpGroup.position.set(0.7, 0.18, -0.25);
  helpGroup.rotation.x = -Math.PI / 8;
  helpGroup.scale.set(0.15, 0.15, 0.15);
  leftController.add(helpGroup);

  const lines = [
    '--- HILFE V7 ---',
    '',
    'PUNKT: x/y/z eingeben,',
    'dann [Punkt erzeugen]',
    '',
    'GERADE: [GERADE]',
    'P1 dann P2 mit Ray',
    '(P1 leuchtet orange)',
    '',
    'VEKTOR: [VEKTOR]',
    'P1 dann P2 mit Ray',
    '',
    'PARAM: x = lambda,',
    '[PARAM] druecken,',
    'dann Gerade anklicken',
    '→ blauer Punkt erscheint',
    '',
    'LOESCHEN:',
    '[P-DEL] Punkt anklicken',
    '[G-DEL] gelbe Kugel',
    '',
    'TOGGLE:',
    'OV/RV/GG/GL/KS',
    '',
    'TELEPORT: linker Ctrl',
    'Trigger gedrückt halten',
  ];

  let row = 0;
  for (const line of lines) {
    if (line === '') { row++; continue; }
    const sprite = makeHelpSprite(line);
    sprite.position.set(0, -row * 0.32, 0);
    helpGroup.add(sprite);
    row++;
  }
}

function makeHelpSprite(text) {
  // Canvas 700×112 → Sprite aspect 700/112 = 6.25
  // Sprite scale (1.875, 0.3, 1) → 1.875/0.3 = 6.25 ✓
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = 700;
  canvas.height = 112;
  ctx.clearRect(0, 0, 700, 112);
  ctx.fillStyle = 'rgba(180,220,255,1)';
  ctx.font = 'bold 42px Arial';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 12, 56);
  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true }));
  sprite.scale.set(1.875, 0.3, 1);
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
