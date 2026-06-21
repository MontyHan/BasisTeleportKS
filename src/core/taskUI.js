import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

// ===== Aufgaben-Daten =====
// Jede Aufgabe hat pages[]. Jede page ist ein Array von Textzeilen (max 8).

const TASK_DATA = {
  A: [
    { pages: [
      ['ErkundungGeraden A  |  Aufg. 1/4',
       'Thema: Schneidende Geraden',
       '',
       'Wir erstellen 2 Geraden g1 und g2',
       'und untersuchen ihre Lagebeziehung.',
       'g1 geht durch Punkte A und B,',
       'g2 geht durch Punkte C und D.'],
      ['Schritt 1: Punkt A eingeben',
       'A(-3 | -1 | 1)',
       '',
       'Panel: x = -3,  y = -1,  z = 1',
       '→ [PUNKT] drücken.'],
      ['Schritt 2: Punkt B eingeben',
       'B(-1 | 0 | 2)',
       '',
       'Panel: x = -1,  y = 0,  z = 2',
       '→ [PUNKT] drücken.'],
      ['Schritt 3: Gerade g1 erstellen',
       '',
       '→ [GERADE] drücken',
       '→ Punkt A antippen',
       '→ Punkt B antippen',
       '',
       'g1 erscheint als Linie im Raum.'],
      ['Schritt 4: Punkt C eingeben',
       'C(4 | -2 | 3)',
       '',
       'Panel: x = 4,  y = -2,  z = 3',
       '→ [PUNKT] drücken.'],
      ['Schritt 5: Punkt D eingeben',
       'D(1 | 1 | 3)',
       '',
       'Panel: x = 1,  y = 1,  z = 3',
       '→ [PUNKT] drücken.'],
      ['Schritt 6: Gerade g2 erstellen',
       '',
       '→ [GERADE] drücken',
       '→ Punkt C antippen',
       '→ Punkt D antippen',
       '',
       'g2 erscheint im Raum.'],
      ['Schritt 7: Betrachte die Geraden',
       '',
       '→ [RV] → Richtungsvektoren u und v.',
       '   Sind u und v parallel?',
       '→ [GG] → Geradengleichungen.',
       '',
       'Geh im Raum herum — schau von',
       'verschiedenen Seiten!'],
      ['Schritt 8: Schnittpunkt berechnen',
       '',
       '→ [SCHNITT] drücken',
       '→ g1 antippen',
       '→ g2 antippen',
       '',
       'Was zeigt die Statuszeile?'],
      ['Ergebnis Aufgabe 1:',
       '',
       'Die Geraden SCHNEIDEN SICH!',
       'Schnittpunkt: S(1 | 1 | 3)',
       '',
       'λ=2 auf g1,  μ=1 auf g2.',
       'Erstelle S: λ=2.0 einstellen,',
       '[λ bestätigen], dann g1 antippen.'],
    ]},
    { pages: [
      ['ErkundungGeraden A  |  Aufg. 2/4',
       'Thema: Parallele Geraden',
       '',
       'Zuerst: [ALLES] (2×) drücken',
       'um alles zu löschen.',
       '',
       'Neue Punkte für g1 und g2.'],
      ['Schritt 1: Punkt A eingeben',
       'A(-4 | 1 | 0)',
       '',
       'Panel: x = -4,  y = 1,  z = 0',
       '→ [PUNKT] drücken.'],
      ['Schritt 2: Punkt B eingeben',
       'B(-1 | 3 | 2)',
       '',
       'Panel: x = -1,  y = 3,  z = 2',
       '→ [PUNKT] drücken.'],
      ['Schritt 3: Gerade g1 durch A und B.',
       '→ [GERADE] → A antippen → B antippen.'],
      ['Schritt 4: Punkt C eingeben',
       'C(2 | -4 | 1)',
       '',
       'Panel: x = 2,  y = -4,  z = 1',
       '→ [PUNKT] drücken.'],
      ['Schritt 5: Punkt D eingeben',
       'D(5 | -2 | 3)',
       '',
       'Panel: x = 5,  y = -2,  z = 3',
       '→ [PUNKT] drücken.'],
      ['Schritt 6: Gerade g2 durch C und D.',
       '→ [GERADE] → C antippen → D antippen.'],
      ['Schritt 7: [RV] aktivieren',
       '',
       'u = (3 | 2 | 2)',
       'v = (3 | 2 | 2)',
       '',
       'Sind u und v identisch?',
       'Was bedeutet das für die Richtung?'],
      ['Schritt 8: [SCHNITT] berechnen',
       '',
       '→ [SCHNITT] drücken',
       '→ g1 antippen → g2 antippen',
       '',
       'Was erscheint in der Statuszeile?'],
      ['Ergebnis Aufgabe 2:',
       '',
       'Die Geraden sind PARALLEL.',
       'u = v — gleiche Richtung,',
       'aber C liegt nicht auf g1.',
       '',
       'Kein Schnittpunkt möglich.'],
    ]},
    { pages: [
      ['ErkundungGeraden A  |  Aufg. 3/4',
       'Thema: Identische Geraden',
       '',
       'Zuerst: [ALLES] (2×) löschen.',
       '',
       'Eine überraschende Situation:',
       'Beide Geraden sind dieselbe!'],
      ['Schritt 1: A(-2 | -3 | 0)',
       'x = -2,  y = -3,  z = 0  →  [PUNKT]'],
      ['Schritt 2: B(-1 | -2 | 1)',
       'x = -1,  y = -2,  z = 1  →  [PUNKT]'],
      ['Schritt 3: Gerade g1 durch A und B.',
       '→ [GERADE] → A → B antippen.'],
      ['Schritt 4: C(0 | -1 | 2)',
       'x = 0,  y = -1,  z = 2  →  [PUNKT]'],
      ['Schritt 5: D(1 | 0 | 3)',
       'x = 1,  y = 0,  z = 3  →  [PUNKT]'],
      ['Schritt 6: Gerade g2 durch C und D.',
       '→ [GERADE] → C → D antippen.'],
      ['Schritt 7: [RV] und [GG] aktivieren',
       '',
       'u = (1|1|1),  v = (1|1|1)',
       '',
       'Vergleiche die Geradengleichungen.',
       'Wo liegen C und D im Raum?',
       'Liegen sie auf g1?'],
      ['Schritt 8: [SCHNITT] berechnen.',
       '',
       'Was zeigt die Statuszeile?',
       '',
       'Warum überlagern sich die',
       'beiden Geraden exakt?'],
      ['Ergebnis Aufgabe 3:',
       '',
       'Die Geraden sind IDENTISCH.',
       'C und D liegen beide auf g1.',
       '',
       'u = v = (1|1|1).',
       'g1 und g2 beschreiben dieselbe Gerade.'],
    ]},
    { pages: [
      ['ErkundungGeraden A  |  Aufg. 4/4',
       'Thema: Windschiefe Geraden',
       '',
       'Zuerst: [ALLES] (2×) löschen.',
       '',
       'Der interessanteste Fall:',
       'Nicht parallel, kein Schnittpunkt!'],
      ['Schritt 1: A(2 | 2 | 0)',
       'x = 2,  y = 2,  z = 0  →  [PUNKT]'],
      ['Schritt 2: B(1 | 1 | 3)',
       'x = 1,  y = 1,  z = 3  →  [PUNKT]'],
      ['Schritt 3: Gerade g1 durch A und B.',
       '→ [GERADE] → A → B antippen.'],
      ['Schritt 4: C(3 | 2 | 0)',
       'x = 3,  y = 2,  z = 0  →  [PUNKT]'],
      ['Schritt 5: D(1 | 3 | 1)',
       'x = 1,  y = 3,  z = 1  →  [PUNKT]'],
      ['Schritt 6: Gerade g2 durch C und D.',
       '→ [GERADE] → C → D antippen.'],
      ['Schritt 7: Betrachte die Geraden',
       '',
       'u = (-1|-1|3)',
       'v = (-2|1|1)',
       '',
       'Sind u und v parallel?',
       'Scheinen die Geraden sich',
       'von oben zu kreuzen?'],
      ['Schritt 8: [SCHNITT] berechnen',
       '',
       '→ [SCHNITT] → g1 → g2 antippen.',
       '',
       'Was zeigt die Statuszeile?'],
      ['Ergebnis Aufgabe 4:',
       '',
       'Die Geraden sind WINDSCHIEF.',
       'Nicht parallel, kein Schnittpunkt.',
       '',
       'Im Raum scheinen sie sich zu',
       'kreuzen — treffen sich aber nie!',
       'Das gibt es nur in 3D!'],
    ]},
  ],
  B: [
    { pages: [
      ['ErkundungGeraden B  |  Aufg. 1/4',
       'Schneidende Geraden',
       '',
       'g1:  A(-3|-1|1),   B(-1|0|2)',
       'g2:  C(4|-2|3),    D(1|1|3)',
       '',
       'Erstelle g1 durch A und B,',
       'dann g2 durch C und D.'],
      ['Beobachtungen:',
       '',
       '1. Aktiviere [RV] und [GG].',
       '   Vergleiche u und v.',
       '   Sind sie ein Vielfaches?',
       '',
       '2. Nutze [SCHNITT] für g1 und g2.',
       '   Was ist das Ergebnis?'],
      ['Reflexion:',
       '',
       'Wo liegt der Schnittpunkt?',
       'Liegt er auf A, B, C oder D?',
       '',
       'Erstelle ihn: λ=2.0 einstellen,',
       '[λ bestätigen], dann g1 antippen.',
       'Was beobachtest du?'],
    ]},
    { pages: [
      ['ErkundungGeraden B  |  Aufg. 2/4',
       'Parallele Geraden',
       '',
       '[ALLES] löschen, dann:',
       'g1:  A(-4|1|0),    B(-1|3|2)',
       'g2:  C(2|-4|1),    D(5|-2|3)',
       '',
       'Erstelle g1 und g2.'],
      ['Beobachtungen:',
       '',
       '1. Aktiviere [RV].',
       '   Vergleiche u und v.',
       '   Was fällt dir auf?',
       '',
       '2. Nutze [SCHNITT].',
       '   Was zeigt die Statuszeile?'],
      ['Reflexion:',
       '',
       'Warum schneiden sich die Geraden',
       'nicht, obwohl u = v gilt?',
       '',
       'Liegt C auf der Geraden g1?',
       'Prüfe mit dem OV-Button [OV].'],
    ]},
    { pages: [
      ['ErkundungGeraden B  |  Aufg. 3/4',
       'Identische Geraden',
       '',
       '[ALLES] löschen, dann:',
       'g1:  A(-2|-3|0),   B(-1|-2|1)',
       'g2:  C(0|-1|2),    D(1|0|3)',
       '',
       'Erstelle g1 und g2.'],
      ['Beobachtungen:',
       '',
       '1. Aktiviere [RV] und [GG].',
       '   Was fällt dir auf?',
       '',
       '2. Nutze [SCHNITT].',
       '   Was zeigt die Statuszeile?',
       '',
       '3. Liegen C und D auf g1?'],
      ['Reflexion:',
       '',
       'Was bedeutet es, wenn zwei',
       'Geraden identisch sind?',
       '',
       'Formuliere eine Bedingung,',
       'wann g1 und g2 dieselbe',
       'Gerade beschreiben.'],
    ]},
    { pages: [
      ['ErkundungGeraden B  |  Aufg. 4/4',
       'Windschiefe Geraden',
       '',
       '[ALLES] löschen, dann:',
       'g1:  A(2|2|0),     B(1|1|3)',
       'g2:  C(3|2|0),     D(1|3|1)',
       '',
       'Erstelle g1 und g2.'],
      ['Beobachtungen:',
       '',
       '1. Aktiviere [RV].',
       '   Sind u und v parallel?',
       '',
       '2. Nutze [SCHNITT].',
       '   Was zeigt die Statuszeile?',
       '',
       '3. Schau von oben: Scheinen',
       '   sich die Geraden zu kreuzen?'],
      ['Reflexion:',
       '',
       '"Windschief": Nicht parallel,',
       'kein Schnittpunkt.',
       '',
       'Gibt es windschiefe Geraden',
       'in der Ebene (2D)?',
       'Warum (nicht)?'],
    ]},
  ],
};

// ===== Zustand =====

let taskGroup = null;
const taskPanelButtons = [];
let taskPanelVisible = false;

let currentVersion = 'A';
let currentTask = 0;
let currentPage = 0;
let contentSprites = [];
let pageSprite = null;

// ===== Öffentliche API =====

export function initTaskUI(scene) {
  taskGroup = new THREE.Group();
  // Fest im Raum: vor dem Start-Rig (3,0,3), auf Augenhöhe
  taskGroup.position.set(3, 1.75, 0.8);
  taskGroup.visible = false;
  scene.add(taskGroup);

  // Version-Buttons (oben)
  _makeBtn('Version A', -0.24, 0.78, () => { currentVersion = 'A'; currentTask = 0; currentPage = 0; _refresh(); });
  _makeBtn('Version B',  0.24, 0.78, () => { currentVersion = 'B'; currentTask = 0; currentPage = 0; _refresh(); });

  // Aufgaben-Buttons
  for (let i = 0; i < 4; i++) {
    const x = -0.38 + i * 0.255;
    const idx = i;
    _makeBtn(`Aufg.${i + 1}`, x, 0.65, () => { currentTask = idx; currentPage = 0; _refresh(); });
  }

  // Navigation (unten)
  _makeBtn('←', -0.38, -0.78, () => { currentPage = Math.max(0, currentPage - 1); _refresh(); });
  _makeBtn('→',  0.38, -0.78, () => {
    const maxP = TASK_DATA[currentVersion][currentTask].pages.length - 1;
    currentPage = Math.min(maxP, currentPage + 1);
    _refresh();
  });

  // Seiten-Anzeige (zwischen den Pfeilen)
  pageSprite = _makeSprite('', 0.32, 0.06);
  pageSprite.position.set(0, -0.78, 0);
  taskGroup.add(pageSprite);

  _refresh();
}

export function toggleTaskPanel() {
  taskPanelVisible = !taskPanelVisible;
  if (taskGroup) taskGroup.visible = taskPanelVisible;
}

export function isTaskPanelVisible() { return taskPanelVisible; }
export function getTaskPanelButtons() { return taskPanelButtons; }

export function updateTaskPanel(camera) {
  if (!taskGroup || !taskPanelVisible) return;
  const camPos = new THREE.Vector3();
  camera.getWorldPosition(camPos);
  taskGroup.lookAt(camPos);
}

// ===== Interne Helfer =====

function _refresh() {
  // Alten Content entfernen
  for (const s of contentSprites) {
    taskGroup.remove(s);
    s.material?.map?.dispose();
    s.material?.dispose();
  }
  contentSprites = [];

  const pages = TASK_DATA[currentVersion][currentTask].pages;
  const lines = pages[currentPage] || [];

  let y = 0.53;
  for (const line of lines) {
    const spr = _makeContentSprite(line);
    spr.position.set(0, y, 0);
    taskGroup.add(spr);
    contentSprites.push(spr);
    y -= 0.115;
  }

  // Seiten-Anzeige aktualisieren
  _updateSprite(pageSprite, `${currentPage + 1} / ${pages.length}`, '#aaddff');
}

function _makeBtn(label, x, y, onClick) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.21, 0.075, 0.02),
    new THREE.MeshBasicMaterial({ color: 0x223388 })
  );
  mesh.position.set(x, y, 0);
  mesh.userData.onClick = onClick;

  const canvas = document.createElement('canvas');
  canvas.width = 280; canvas.height = 100;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, 280, 100);
  ctx.fillStyle = 'white';
  ctx.font = 'bold 42px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, 140, 50);
  const tex = new THREE.CanvasTexture(canvas);
  tex.minFilter = THREE.LinearFilter;
  const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true }));
  spr.position.set(0, 0, 0.015);
  spr.scale.set(0.21, 0.075, 1);
  mesh.add(spr);

  taskGroup.add(mesh);
  taskPanelButtons.push(mesh);
  return mesh;
}

function _makeContentSprite(text) {
  const isHeader = text.startsWith('Schritt') || text.startsWith('Ergebnis') ||
                   text.startsWith('Beobacht') || text.startsWith('Reflexion') ||
                   text.startsWith('Erkundung');
  const isCoord  = /^[A-Z]\(/.test(text) || /^g[12]:/.test(text);
  const isArrow  = text.startsWith('→');

  const color = isHeader ? '#88ccff' : isCoord ? '#ffff88' : isArrow ? '#ffcc88' : 'white';
  return _makeSprite(text, 1.0, 0.095, color);
}

function _makeSprite(text, w, h, color = 'white') {
  const canvas = document.createElement('canvas');
  canvas.width = 800;
  canvas.height = Math.round(800 * h / w);
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (text) {
    ctx.fillStyle = color;
    ctx.font = `bold ${Math.round(canvas.height * 0.62)}px Arial`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 10, canvas.height / 2);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.minFilter = THREE.LinearFilter;
  const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true }));
  spr.scale.set(w, h, 1);
  return spr;
}

function _updateSprite(spr, text, color = 'white') {
  if (!spr?.material?.map?.image) return;
  const canvas = spr.material.map.image;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = color;
  ctx.font = `bold ${Math.round(canvas.height * 0.62)}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);
  spr.material.map.needsUpdate = true;
}
