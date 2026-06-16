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

  onCreatePoint          = options.onCreatePoint          ?? null;
  onGeradeMode           = options.onGeradeMode           ?? null;
  onDeleteMode           = options.onDeleteMode           ?? null;
  onToggleOrtsvektoren   = options.onToggleOrtsvektoren   ?? null;
  onToggleRichtungsvektor = options.onToggleRichtungsvektor ?? null;

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

  // Status-Anzeige (kein Button, nur Text)
  statusSprite = makeTextSprite('Bereit', 46);
  statusSprite.position.set(0, -1.05, 0);
  statusSprite.scale.set(0.9, 0.3, 1);
  panelRoot.add(statusSprite);

  // Punkt erzeugen
  const createBtn = makeWideButton('Punkt erzeugen', 0, -1.45, () => {
    if (onCreatePoint) onCreatePoint(values.x, values.y, values.z);
  }, 40);
  panelRoot.add(createBtn);
  buttons.push(createBtn);

  // GERADE (aktiviert Auswahl-Modus)
  const geradeBtn = makeWideButton('GERADE', 0, -1.9, () => {
    if (onGeradeMode) onGeradeMode();
  });
  panelRoot.add(geradeBtn);
  buttons.push(geradeBtn);

  // LÖSCHEN (aktiviert Lösch-Modus)
  const loeschenBtn = makeWideButton('LOESCHEN', 0, -2.35, () => {
    if (onDeleteMode) onDeleteMode();
  });
  panelRoot.add(loeschenBtn);
  buttons.push(loeschenBtn);

  // OV und RV nebeneinander
  ovToggleBtn = makeButton('OV:AUS', 0.0, -2.8, () => {
    ortsvektorenVisible = !ortsvektorenVisible;
    if (onToggleOrtsvektoren) onToggleOrtsvektoren(ortsvektorenVisible);
    updateButtonLabel(ovToggleBtn, ortsvektorenVisible ? 'OV:AN' : 'OV:AUS', ortsvektorenVisible);
  });
  panelRoot.add(ovToggleBtn);
  buttons.push(ovToggleBtn);

  rvToggleBtn = makeButton('RV:AUS', 0.3, -2.8, () => {
    richtungsvektorVisible = !richtungsvektorVisible;
    if (onToggleRichtungsvektor) onToggleRichtungsvektor(richtungsvektorVisible);
    updateButtonLabel(rvToggleBtn, richtungsvektorVisible ? 'RV:AN' : 'RV:AUS', richtungsvektorVisible);
  });
  panelRoot.add(rvToggleBtn);
  buttons.push(rvToggleBtn);

  // HILFE Toggle
  const hilfeBtn = makeWideButton('? HILFE', 0, -3.25, () => {
    helpVisible = !helpVisible;
    if (helpGroup) helpGroup.visible = helpVisible;
  });
  panelRoot.add(hilfeBtn);
  buttons.push(hilfeBtn);
}

function createHelpPanel() {
  helpGroup = new THREE.Group();
  helpGroup.visible = false;
  // Neben dem Haupt-Panel (rechts vom Controller)
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
    'OV / RV:',
    'Vektoren ein/aus',
  ];

  let row = 0;
  lines.forEach(line => {
    if (line === '') { row++; return; }
    const sprite = makeHelpTextSprite(line);
    sprite.position.set(0.45, -row * 0.38, 0);
    helpGroup.add(sprite);
    row++;
  });
}

function makeHelpTextSprite(text) {
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
  const mat = new THREE.SpriteMaterial({ map: texture, transparent: true });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(1.05, 0.32, 1);
  return sprite;
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

  const minus = makeButton('-', 0.2, y, () => { values[axis] -= 1; updateText(); });
  const plus  = makeButton('+', 0.45, y, () => { values[axis] += 1; updateText(); });
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
  const spr = makeTextSprite(label, 48);
  spr.position.set(0, 0, 0.06);
  spr.scale.set(0.2, 0.2, 1);
  mesh.add(spr);
  return mesh;
}

function makeWideButton(label, x, y, onClick, fontSize = 56) {
  const geo = new THREE.BoxGeometry(0.4, 0.2, 0.05);
  const mat = new THREE.MeshBasicMaterial({ color: 0x4444ff });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(x, y, 0);
  mesh.userData.onClick = onClick;
  mesh.userData.label = label;
  const spr = makeTextSprite(label, fontSize);
  spr.position.set(0, 0, 0.06);
  spr.scale.set(0.4, 0.2, 1);
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
  const mat = new THREE.SpriteMaterial({ map: texture, transparent: true });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(0.75, 0.35, 1);
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
