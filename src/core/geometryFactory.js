import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

export function createPoint(scene, x, y, z, color = 0xff0000, radius = 0.05) {
  const geo = new THREE.SphereGeometry(radius, 16, 16);
  const mat = new THREE.MeshBasicMaterial({ color });
  const point = new THREE.Mesh(geo, mat);
  point.position.set(x, y, z);
  scene.add(point);
  return point;
}

export function createLine(scene, points, color = 0x00ffcc) {
  const geo = new THREE.BufferGeometry().setFromPoints(points);
  const mat = new THREE.LineBasicMaterial({ color });
  const line = new THREE.Line(geo, mat);
  scene.add(line);
  return line;
}

// Gerade durch 2 Punkte (Mathebuch-Koordinaten), beidseitig verlängert
export function createGerade(parent, p1Math, p2Math, color = 0xffff00) {
  const a = new THREE.Vector3(p1Math.y, p1Math.z, p1Math.x);
  const b = new THREE.Vector3(p2Math.y, p2Math.z, p2Math.x);
  const dir = b.clone().sub(a).normalize();
  const start = a.clone().sub(dir.clone().multiplyScalar(10));
  const end   = a.clone().add(dir.clone().multiplyScalar(10));
  const geo = new THREE.BufferGeometry().setFromPoints([start, end]);
  const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color }));
  parent.add(line);
  return line;
}

// Richtungsvektor-Pfeil + Label. Gibt {arrow, label} zurück, beide in parent eingefügt.
export function createRichtungsvektor(parent, p1Math, p2Math, color = 0xff8800, letter = 'u') {
  const a = new THREE.Vector3(p1Math.y, p1Math.z, p1Math.x);
  const b = new THREE.Vector3(p2Math.y, p2Math.z, p2Math.x);
  const dir = b.clone().sub(a);
  const length = dir.length();
  if (length < 0.001) return { arrow: null, label: null };

  const arrow = new THREE.ArrowHelper(
    dir.normalize(), a, length, color,
    Math.min(length * 0.2, 0.4),
    Math.min(length * 0.1, 0.2)
  );
  parent.add(arrow);

  const rv = {
    x: p2Math.x - p1Math.x,
    y: p2Math.y - p1Math.y,
    z: p2Math.z - p1Math.z
  };
  const canvas = buildRVCanvas(rv, letter);
  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  const label = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true }));
  const mid = a.clone().add(b).multiplyScalar(0.5);
  label.position.set(mid.x + 0.25, mid.y + 0.25, mid.z);
  label.scale.set(0.5, 0.45, 1); // canvas 200×180 → aspect 1.11 ✓
  parent.add(label);

  return { arrow, label };
}

// Geradengleichung als Sprite-Label in Vektorschreibweise
export function createGeradengleichungLabel(p1Math, p2Math) {
  const rv = {
    x: p2Math.x - p1Math.x,
    y: p2Math.y - p1Math.y,
    z: p2Math.z - p1Math.z
  };

  const canvas = buildEquationCanvas(p1Math, rv);
  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;

  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: texture, transparent: true })
  );
  sprite.position.set(
    (p1Math.y + p2Math.y) / 2,
    (p1Math.z + p2Math.z) / 2 + 0.6,
    (p1Math.x + p2Math.x) / 2
  );
  sprite.scale.set(1.5, 0.5, 1); // canvas 600×200 → aspect 3:1 ✓
  return sprite;
}

// ===== private canvas helpers =====

function buildRVCanvas(rv, letter = 'u') {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = 200;
  canvas.height = 180;

  roundRectFill(ctx, 2, 2, 196, 176, 6, 'rgba(10,10,35,0.85)');
  ctx.fillStyle = 'white';
  ctx.textBaseline = 'middle';

  const y1 = 40, y2 = 90, y3 = 140;
  const ytop = 14, ybot = 166;

  // "u⃗ ="
  ctx.font = 'bold 24px Arial';
  ctx.textAlign = 'left';
  let cx = 8;
  ctx.fillText(letter, cx, y2);
  const uw = ctx.measureText(letter).width;
  drawVectorArrow(ctx, cx + uw / 2, y2 - 16, uw + 2);
  cx += uw;
  ctx.fillText(' =', cx, y2);
  cx += ctx.measureText(' =').width + 8;

  // Spaltenvektor
  ctx.font = 'bold 22px Arial';
  const maxW = Math.max(
    ctx.measureText(String(rv.x)).width,
    ctx.measureText(String(rv.y)).width,
    ctx.measureText(String(rv.z)).width
  );
  const colW = maxW + 8;
  const bL = cx;
  const numCx = bL + 10 + colW / 2;
  const bR = bL + 10 + colW + 10;

  drawBracketL(ctx, bL, ytop, ybot);
  ctx.textAlign = 'center';
  ctx.fillText(String(rv.x), numCx, y1);
  ctx.fillText(String(rv.y), numCx, y2);
  ctx.fillText(String(rv.z), numCx, y3);
  drawBracketR(ctx, bR, ytop, ybot);

  return canvas;
}

function buildEquationCanvas(ov, rv) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = 600;
  canvas.height = 200;

  roundRectFill(ctx, 4, 4, 592, 192, 8, 'rgba(10,10,35,0.88)');
  ctx.fillStyle = 'white';
  ctx.textBaseline = 'middle';

  const y1 = 44, y2 = 100, y3 = 156;
  const ytop = 16, ybot = 184;

  ctx.font = 'bold 32px Arial';
  ctx.textAlign = 'left';
  let cx = 10;

  ctx.fillText('g:', cx, y2);
  cx += ctx.measureText('g:').width + 5;

  const xw = ctx.measureText('x').width;
  ctx.fillText('x', cx, y2);
  drawVectorArrow(ctx, cx + xw / 2, y2 - 21, xw + 4);
  cx += xw;
  ctx.fillText(' =', cx, y2);
  cx += ctx.measureText(' =').width + 10;

  // OV
  ctx.font = 'bold 30px Arial';
  const ovMaxW = Math.max(
    ctx.measureText(String(ov.x)).width,
    ctx.measureText(String(ov.y)).width,
    ctx.measureText(String(ov.z)).width
  );
  const ovColW = ovMaxW + 10;
  const ovL = cx;
  const ovNumCx = ovL + 14 + ovColW / 2;
  const ovR = ovL + 14 + ovColW + 14;
  drawBracketL(ctx, ovL, ytop, ybot);
  ctx.textAlign = 'center';
  ctx.fillText(String(ov.x), ovNumCx, y1);
  ctx.fillText(String(ov.y), ovNumCx, y2);
  ctx.fillText(String(ov.z), ovNumCx, y3);
  drawBracketR(ctx, ovR, ytop, ybot);
  cx = ovR + 8;

  // "+ λ·"
  ctx.font = 'bold 32px Arial';
  ctx.textAlign = 'left';
  ctx.fillText('+ λ·', cx, y2);
  cx += ctx.measureText('+ λ·').width + 8;

  // RV
  ctx.font = 'bold 30px Arial';
  const rvMaxW = Math.max(
    ctx.measureText(String(rv.x)).width,
    ctx.measureText(String(rv.y)).width,
    ctx.measureText(String(rv.z)).width
  );
  const rvColW = rvMaxW + 10;
  const rvL = cx;
  const rvNumCx = rvL + 14 + rvColW / 2;
  const rvR = rvL + 14 + rvColW + 14;
  drawBracketL(ctx, rvL, ytop, ybot);
  ctx.textAlign = 'center';
  ctx.fillText(String(rv.x), rvNumCx, y1);
  ctx.fillText(String(rv.y), rvNumCx, y2);
  ctx.fillText(String(rv.z), rvNumCx, y3);
  drawBracketR(ctx, rvR, ytop, ybot);

  return canvas;
}

function drawVectorArrow(ctx, cx, y, width) {
  ctx.save();
  ctx.strokeStyle = 'white';
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  const hw = Math.max(width / 2, 6);
  ctx.beginPath();
  ctx.moveTo(cx - hw, y);
  ctx.lineTo(cx + hw - 5, y);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx + hw - 9, y - 5);
  ctx.lineTo(cx + hw - 2, y);
  ctx.lineTo(cx + hw - 9, y + 5);
  ctx.stroke();
  ctx.restore();
}

function drawBracketL(ctx, x, yTop, yBot) {
  ctx.save();
  ctx.strokeStyle = 'white';
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'square';
  ctx.beginPath();
  ctx.moveTo(x + 10, yTop); ctx.lineTo(x, yTop);
  ctx.lineTo(x, yBot);
  ctx.lineTo(x + 10, yBot);
  ctx.stroke();
  ctx.restore();
}

function drawBracketR(ctx, x, yTop, yBot) {
  ctx.save();
  ctx.strokeStyle = 'white';
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'square';
  ctx.beginPath();
  ctx.moveTo(x - 10, yTop); ctx.lineTo(x, yTop);
  ctx.lineTo(x, yBot);
  ctx.lineTo(x - 10, yBot);
  ctx.stroke();
  ctx.restore();
}

function roundRectFill(ctx, x, y, w, h, r, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  ctx.fill();
}
