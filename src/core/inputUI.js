import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

let scene, camera, rig, leftController, rightController;

const raycaster = new THREE.Raycaster();
const tempMatrix = new THREE.Matrix4();

const buttons = [];
const values = { x: 0, y: 0, z: 0 };
let lambdaValue = 0;
const textSprites = {};
let lambdaSprite = null;

let panelRoot = null;
let statusSprite = null;
let helpGroup = null;
let helpVisible = false;

let onCreatePoint = null;
let onGeradeMode = null;
let onVektorMode = null;
let onParamMode = null;
let onLaengeMode = null;
let onWinkelMode = null;
let onSchnittMode = null;
let onDeleteMode = null;
let onDeleteAll = null;
let onUndoLast = null;
let onToggleOrtsvektoren = null;
let onToggleRichtungsvektor = null;
let onToggleGeradengleichung = null;
let onToggleGL = null;
let onToggleBodenKS = null;
let onToggleKoordinaten = null;
let onToggleTask = null;

let ortsvektorenVisible = false;
let richtungsvektorVisible = true;
let geradengleichungVisible = false;
let glVisible = true;
let ksVisible = false;
let koordinatenVisible = false;

let ovToggleBtn = null;
let rvToggleBtn = null;
let ggToggleBtn = null;
let glToggleBtn = null;
let ksToggleBtn = null;
let koToggleBtn = null;

let deleteAllPending = false;
let deleteAllTimer = null;

export function initInputUI(s, cam, r, lCtrl, rCtrl, options = {}) {
  scene = s; camera = cam; rig = r;
  leftController = lCtrl; rightController = rCtrl;

  onCreatePoint            = options.onCreatePoint            ?? null;
  onGeradeMode             = options.onGeradeMode             ?? null;
  onVektorMode             = options.onVektorMode             ?? null;
  onParamMode              = options.onParamMode              ?? null;
  onLaengeMode             = options.onLaengeMode             ?? null;
  onWinkelMode             = options.onWinkelMode             ?? null;
  onSchnittMode            = options.onSchnittMode            ?? null;
  onDeleteMode             = options.onDeleteMode             ?? null;
  onDeleteAll              = options.onDeleteAll              ?? null;
  onUndoLast               = options.onUndoLast               ?? null;
  onToggleOrtsvektoren     = options.onToggleOrtsvektoren     ?? null;
  onToggleRichtungsvektor  = options.onToggleRichtungsvektor  ?? null;
  onToggleGeradengleichung = options.onToggleGeradengleichung ?? null;
  onToggleGL               = options.onToggleGL               ?? null;
  onToggleBodenKS          = options.onToggleBodenKS          ?? null;
  onToggleKoordinaten      = options.onToggleKoordinaten      ?? null;
  onToggleTask             = options.onToggleTask             ?? null;

  createPanel();
  createHelpPanel();
}

export function setPanelStatus(text, color = 'white') {
  if (statusSprite?.material?.map?.image) {
    const canvas = statusSprite.material.map.image;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = color;
    ctx.font = 'bold 55px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);
    statusSprite.material.map.needsUpdate = true;
  }
}

export function setPanelVisible(visible) {
  if (panelRoot) panelRoot.visible = visible;
  if (helpGroup) {
    if (!visible) helpGroup.userData.wasVisible = helpGroup.visible;
    helpGroup.visible = visible ? (helpGroup.userData.wasVisible ?? false) : false;
  }
}

export function getLambdaValue() { return lambdaValue; }
export function getInputValues() { return { ...values }; }

// ===== Panel-Aufbau =====

function createPanel() {
  panelRoot = new THREE.Group();
  panelRoot.position.set(0, 0.18, -0.25);
  panelRoot.rotation.x = -Math.PI / 8;
  panelRoot.scale.set(0.15, 0.15, 0.15);
  leftController.add(panelRoot);

  addWide('? HILFE', 0, 0, () => {
    helpVisible = !helpVisible;
    if (helpGroup) {
      helpGroup.visible = helpVisible;
      helpGroup.userData.wasVisible = helpVisible;
    }
  });

  createRow(panelRoot, 'x', -0.3);
  createRow(panelRoot, 'y', -0.6);
  createRow(panelRoot, 'z', -0.9);

  statusSprite = makeTextSprite('Bereit', 55);
  statusSprite.position.set(0, -1.1, 0);
  statusSprite.scale.set(0.9, 0.3, 1);
  panelRoot.add(statusSprite);

  // ---- ERZEUGEN ----
  makeRowLabel('ERZEUGEN', -0.38, -1.4);
  addNarrow('PUNKT', 0.0, -1.4, () => {
    cancelDeleteAll();
    if (onCreatePoint) onCreatePoint(values.x, values.y, values.z);
  });
  addNarrow('VEKTOR', 0.24, -1.4, () => {
    cancelDeleteAll();
    if (onVektorMode) onVektorMode();
  });
  addNarrow('GERADE', 0.48, -1.4, () => {
    cancelDeleteAll();
    if (onGeradeMode) onGeradeMode();
  });

  // ---- LOESCHEN ----
  makeRowLabel('LOESCHEN', -0.38, -1.65);
  addNarrow('P-DEL', 0.0, -1.65, () => {
    cancelDeleteAll();
    if (onDeleteMode) onDeleteMode('punkt');
  });
  addNarrow('G-DEL', 0.24, -1.65, () => {
    cancelDeleteAll();
    if (onDeleteMode) onDeleteMode('gerade');
  });
  const allDelBtn = addNarrow('ALLES', 0.48, -1.65, () => {
    if (!deleteAllPending) {
      deleteAllPending = true;
      setPanelStatus('Sicher? Nochmal!', '#ff8800');
      deleteAllTimer = setTimeout(() => {
        deleteAllPending = false;
        setPanelStatus('Bereit');
      }, 5000);
    } else {
      clearTimeout(deleteAllTimer);
      deleteAllPending = false;
      if (onDeleteAll) onDeleteAll();
      setPanelStatus('Alles geloescht!', '#ff4444');
      setTimeout(() => setPanelStatus('Bereit'), 2000);
    }
  });
  allDelBtn.material.color.setHex(0x883322);

  // ---- 6 Toggles (OV RV GG GL KS KO) ----
  ovToggleBtn = addNarrow('OV:AUS', -0.5, -1.9, () => {
    cancelDeleteAll();
    ortsvektorenVisible = !ortsvektorenVisible;
    if (onToggleOrtsvektoren) onToggleOrtsvektoren(ortsvektorenVisible);
    updateButtonLabel(ovToggleBtn, ortsvektorenVisible ? 'OV:AN' : 'OV:AUS', ortsvektorenVisible);
  });
  rvToggleBtn = addNarrow('RV:AN', -0.3, -1.9, () => {
    cancelDeleteAll();
    richtungsvektorVisible = !richtungsvektorVisible;
    if (onToggleRichtungsvektor) onToggleRichtungsvektor(richtungsvektorVisible);
    updateButtonLabel(rvToggleBtn, richtungsvektorVisible ? 'RV:AN' : 'RV:AUS', richtungsvektorVisible);
  });
  rvToggleBtn.material.color.setHex(0x44aa44);

  ggToggleBtn = addNarrow('GG:AUS', -0.1, -1.9, () => {
    cancelDeleteAll();
    geradengleichungVisible = !geradengleichungVisible;
    if (onToggleGeradengleichung) onToggleGeradengleichung(geradengleichungVisible);
    updateButtonLabel(ggToggleBtn, geradengleichungVisible ? 'GG:AN' : 'GG:AUS', geradengleichungVisible);
  });
  glToggleBtn = addNarrow('GL:AN', 0.1, -1.9, () => {
    cancelDeleteAll();
    glVisible = !glVisible;
    if (onToggleGL) onToggleGL(glVisible);
    updateButtonLabel(glToggleBtn, glVisible ? 'GL:AN' : 'GL:AUS', glVisible);
  });
  glToggleBtn.material.color.setHex(0x44aa44);

  ksToggleBtn = addNarrow('KS:AUS', 0.3, -1.9, () => {
    cancelDeleteAll();
    ksVisible = !ksVisible;
    if (onToggleBodenKS) onToggleBodenKS(ksVisible);
    updateButtonLabel(ksToggleBtn, ksVisible ? 'KS:AN' : 'KS:AUS', ksVisible);
  });
  koToggleBtn = addNarrow('KO:AUS', 0.5, -1.9, () => {
    cancelDeleteAll();
    koordinatenVisible = !koordinatenVisible;
    if (onToggleKoordinaten) onToggleKoordinaten(koordinatenVisible);
    updateButtonLabel(koToggleBtn, koordinatenVisible ? 'KO:AN' : 'KO:AUS', koordinatenVisible);
  });

  // ---- λ-Reihe ----
  createLambdaRow(panelRoot, -2.15);

  // ---- UNDO + LAENGE (λ bestätigen ist jetzt in der λ-Zeile) ----
  addMedium('UNDO', -0.22, -2.4, () => {
    cancelDeleteAll();
    if (onUndoLast) onUndoLast();
  });
  addMedium('LAENGE', 0.22, -2.4, () => {
    cancelDeleteAll();
    if (onLaengeMode) onLaengeMode();
  });

  // ---- BERECHNEN: WINKEL + SCHNITT ----
  makeRowLabel('BERECHNEN', -0.52, -2.65);
  addMedium('WINKEL', -0.12, -2.65, () => {
    cancelDeleteAll();
    if (onWinkelMode) onWinkelMode();
  });
  addMedium('SCHNITT', 0.22, -2.65, () => {
    cancelDeleteAll();
    if (onSchnittMode) onSchnittMode();
  });

  // ---- AUFGABEN-Panel Toggle ----
  const taskBtn = addWide('AUFGABEN', 0, -2.92, () => {
    cancelDeleteAll();
    if (onToggleTask) onToggleTask();
  });
  taskBtn.material.color.setHex(0x335500);
}

function cancelDeleteAll() {
  if (deleteAllPending) {
    clearTimeout(deleteAllTimer);
    deleteAllPending = false;
    setPanelStatus('Bereit');
  }
}

// ===== Button-Typen =====

function addWide(label, x, y, onClick) {
  const btn = makeWideButton(label, x, y, onClick);
  panelRoot.add(btn); buttons.push(btn); return btn;
}
function addMedium(label, x, y, onClick) {
  const btn = makeMediumButton(label, x, y, onClick);
  panelRoot.add(btn); buttons.push(btn); return btn;
}
function addNarrow(label, x, y, onClick) {
  const btn = makeNarrowButton(label, x, y, onClick);
  panelRoot.add(btn); buttons.push(btn); return btn;
}

function makeWideButton(label, x, y, onClick) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.4, 0.2, 0.05),
    new THREE.MeshBasicMaterial({ color: 0x4444ff })
  );
  mesh.position.set(x, y, 0);
  mesh.userData.onClick = onClick;
  mesh.userData.fontSize = 67;
  const spr = makeTextSprite(label, 67);
  spr.position.set(0, 0, 0.06); spr.scale.set(0.4, 0.2, 1);
  mesh.add(spr);
  return mesh;
}

function makeMediumButton(label, x, y, onClick, fontSize = 60) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.3, 0.18, 0.05),
    new THREE.MeshBasicMaterial({ color: 0x4444ff })
  );
  mesh.position.set(x, y, 0);
  mesh.userData.onClick = onClick;
  mesh.userData.fontSize = fontSize;
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = 384; canvas.height = 230;
  ctx.clearRect(0, 0, 384, 230);
  ctx.fillStyle = 'white';
  ctx.font = `bold ${fontSize}px Arial`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(label, 192, 115);
  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true }));
  spr.position.set(0, 0, 0.06); spr.scale.set(0.3, 0.18, 1);
  mesh.add(spr);
  return mesh;
}

function makeNarrowButton(label, x, y, onClick) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.2, 0.15, 0.05),
    new THREE.MeshBasicMaterial({ color: 0x4444ff })
  );
  mesh.position.set(x, y, 0);
  mesh.userData.onClick = onClick;
  mesh.userData.fontSize = 46;
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = 256; canvas.height = 192;
  ctx.clearRect(0, 0, 256, 192);
  ctx.fillStyle = 'white';
  ctx.font = 'bold 46px Arial';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(label, 128, 96);
  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true }));
  spr.position.set(0, 0, 0.06); spr.scale.set(0.2, 0.15, 1);
  mesh.add(spr);
  return mesh;
}

function makeSmallButton(label, x, y, onClick) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.2, 0.2, 0.05),
    new THREE.MeshBasicMaterial({ color: 0x4444ff })
  );
  mesh.position.set(x, y, 0);
  mesh.userData.onClick = onClick;
  mesh.userData.fontSize = 96;
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = 256; canvas.height = 256;
  ctx.clearRect(0, 0, 256, 256);
  ctx.fillStyle = 'white';
  ctx.font = 'bold 96px Arial';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(label, 128, 128);
  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true }));
  spr.position.set(0, 0, 0.06); spr.scale.set(0.2, 0.2, 1);
  mesh.add(spr);
  return mesh;
}

function updateButtonLabel(btn, label, active) {
  if (!btn) return;
  btn.material.color.setHex(active ? 0x44aa44 : 0x4444ff);
  const sprite = btn.children[0];
  if (!sprite?.material?.map?.image) return;
  const fs = btn.userData.fontSize || 67;
  const canvas = sprite.material.map.image;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = 'white';
  ctx.font = `bold ${fs}px Arial`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(label, canvas.width / 2, canvas.height / 2);
  sprite.material.map.needsUpdate = true;
}

function makeRowLabel(text, x, y) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = 384; canvas.height = 128;
  ctx.clearRect(0, 0, 384, 128);
  ctx.fillStyle = 'rgba(200,220,255,1)';
  ctx.font = 'bold 46px Arial';
  ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
  ctx.fillText(text, 374, 64);
  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true }));
  spr.position.set(x, y, 0);
  spr.scale.set(0.33, 0.11, 1);
  panelRoot.add(spr);
}

// ===== Koordinaten-Zeilen (x / y / z) =====

function createRow(parent, axis, y) {
  const text = makeTextSprite(`${axis}: 0`);
  text.position.set(-0.5, y, 0);
  text.scale.set(0.6, 0.27, 1);
  parent.add(text);
  textSprites[axis] = text;

  const minus = makeSmallButton('-', 0.05, y, () => { values[axis] -= 1; updateText(); });
  const plus  = makeSmallButton('+', 0.28, y, () => { values[axis] += 1; updateText(); });
  parent.add(plus, minus);
  buttons.push(plus, minus);
}

function updateText() {
  for (const axis in textSprites) {
    const newSprite = makeTextSprite(`${axis}: ${values[axis]}`);
    newSprite.position.copy(textSprites[axis].position);
    newSprite.scale.set(0.6, 0.27, 1);
    const old = textSprites[axis];
    if (old.parent) old.parent.remove(old);
    old.material.map?.dispose();
    old.material.dispose();
    textSprites[axis] = newSprite;
    panelRoot.add(newSprite);
  }
}

// ===== λ-Eingabe Reihe =====

function createLambdaRow(parent, y) {
  lambdaSprite = makeTextSprite('λ: 0.0');
  lambdaSprite.position.set(-0.5, y, 0);
  lambdaSprite.scale.set(0.4, 0.27, 1);
  parent.add(lambdaSprite);

  const minus = makeSmallButton('-', -0.1, y, () => {
    lambdaValue = Math.round((lambdaValue - 0.1) * 10) / 10;
    updateLambdaSprite();
  });
  const plus  = makeSmallButton('+', 0.12, y, () => {
    lambdaValue = Math.round((lambdaValue + 0.1) * 10) / 10;
    updateLambdaSprite();
  });
  parent.add(minus, plus);
  buttons.push(minus, plus);

  // λ bestätigen – löst den PARAM-Modus aus
  const confirmBtn = makeMediumButton('λ bestätigen', 0.4, y, () => {
    cancelDeleteAll();
    if (onParamMode) onParamMode();
  }, 48);
  confirmBtn.material.color.setHex(0x225588);
  parent.add(confirmBtn);
  buttons.push(confirmBtn);
}

function updateLambdaSprite() {
  if (!lambdaSprite) return;
  const canvas = lambdaSprite.material.map.image;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = 'white';
  ctx.font = 'bold 67px Arial';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(`λ: ${lambdaValue.toFixed(1)}`, canvas.width / 2, canvas.height / 2);
  lambdaSprite.material.map.needsUpdate = true;
}

function makeTextSprite(text, fontSize = 67) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = 512; canvas.height = 256;
  ctx.clearRect(0, 0, 512, 256);
  ctx.fillStyle = 'white';
  ctx.font = `bold ${fontSize}px Arial`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(text, 256, 128);
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
  helpGroup.userData.wasVisible = false;
  helpGroup.position.set(0.7, 0.18, -0.25);
  helpGroup.rotation.x = -Math.PI / 8;
  helpGroup.scale.set(0.15, 0.15, 0.15);
  leftController.add(helpGroup);

  const lines = [
    '--- HILFE V12 ---',
    '',
    'PUNKT: x/y/z → [PUNKT]',
    '→ Punkte: A, B, C, ...',
    'VEKTOR: [VEKTOR] P1→P2',
    'GERADE: [GERADE] P1→P2',
    '',
    'PARAM-Punkt auf Gerade:',
    '1. λ mit +/- einstellen',
    '2. [λ bestätigen] drücken',
    '3. Gerade antippen',
    '',
    'LAENGE: [LAENGE],',
    'gelbe Kugel antippen',
    '',
    'WINKEL: [WINKEL], dann',
    '2 Vektoren antippen',
    '',
    'SCHNITT: [SCHNITT], dann',
    '2 Geraden antippen',
    '',
    'UNDO: letzten Schritt rueckgaengig',
    '',
    'LOESCHEN: P-DEL G-DEL ALLES(2x)',
    'TOGGLE: OV RV GG GL KS KO',
    'TELEPORT: linker Ctrl halten',
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
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = 700; canvas.height = 112;
  ctx.clearRect(0, 0, 700, 112);
  ctx.fillStyle = 'rgba(180,220,255,1)';
  ctx.font = 'bold 50px Arial';
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
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
