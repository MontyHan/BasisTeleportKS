import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { createLine, createPoint } from './geometryFactory.js';

let scene;

let vectorGroup = null;     // für aktuellen UI-Vektor
let spriteRoot = null;

let labelSprites = {};

// ✅ NEU: Gruppe für ALLE Ortsvektoren
let ortsvektorGroup = null;

export function initVectorUI(s) {
  scene = s;

  vectorGroup = new THREE.Group();
  scene.add(vectorGroup);

  // ✅ NEU
  ortsvektorGroup = new THREE.Group();
  scene.add(ortsvektorGroup);

  spriteRoot = new THREE.Group();
  spriteRoot.position.set(1.2, 1.7, -2);
  scene.add(spriteRoot);

  labelSprites = {
    vx: makeTextSprite('vx: 0'),
    vy: makeTextSprite('vy: 0'),
    vz: makeTextSprite('vz: 0'),
  };

  labelSprites.vx.position.set(0, 0.15, 0);
  labelSprites.vy.position.set(0, -0.15, 0);
  labelSprites.vz.position.set(0, -0.45, 0);

  spriteRoot.add(labelSprites.vx, labelSprites.vy, labelSprites.vz);
}

/**
 * Set vector from components (math textbook coordinate system)
 * x = towards viewer (positive +Z in Three.js)
 * y = right (positive +X in Three.js)
 * z = up (positive +Y in Three.js)
 */
export function setVectorFromComponents(x, y, z, opts = {}) {
  if (!scene || !vectorGroup) return;

  // Alte Geometrie/Material sauber entfernen
  while (vectorGroup.children.length) {
    const child = vectorGroup.children[0];
    vectorGroup.remove(child);

    if (child.geometry) child.geometry.dispose?.();
    if (child.material) {
      if (Array.isArray(child.material)) {
        for (const m of child.material) {
          m.map?.dispose?.();
          m.dispose?.();
        }
      } else {
        child.material.map?.dispose?.();
        child.material.dispose?.();
      }
    }
  }

  const start = new THREE.Vector3(0, 0, 0);
  // Convert math coordinates to Three.js: (x_math, y_math, z_math) → (y, z, x)
  // x_math (towards viewer) maps to +Z, y_math (right) maps to +X, z_math (up) maps to +Y
  const end = new THREE.Vector3(y, z, x);

  createLine(vectorGroup, [start, end], opts.lineColor ?? 0x00ffcc);

  createPoint(
    vectorGroup,
    end.x,
    end.y,
    end.z,
    opts.pointColor ?? 0x00ff00,
    0.06
  );

  updateSprite(labelSprites.vx, `vx: ${x}`);
  updateSprite(labelSprites.vy, `vy: ${y}`);
  updateSprite(labelSprites.vz, `vz: ${z}`);
}

//
// ✅ NEU: Ortsvektor pro Punkt (math textbook coordinate system)
//
export function addOrtsvektorForPoint(point, x, y, z, index) {
  if (!ortsvektorGroup) return;

  const group = new THREE.Group();

  const start = new THREE.Vector3(0, 0, 0);
  // Convert math coordinates to Three.js: (x_math, y_math, z_math) → (y, z, x)
  const end = new THREE.Vector3(y, z, x);

  // Linie
  const geometry = new THREE.BufferGeometry().setFromPoints([start, end]);
  const material = new THREE.LineBasicMaterial({ color: 0x00ffcc });
  const line = new THREE.Line(geometry, material);
  group.add(line);

  // Pfeil
  const dir = end.clone().normalize();
  const length = end.length();

  const arrow = new THREE.ArrowHelper(
    dir,
    start,
    length,
    0x00ffcc,
    0.2,
    0.1
  );
  group.add(arrow);

  // Label
  const sprite = makeTextSprite(`r${index} = (${x}/${y}/${z})`);
  sprite.position.set(end.x + 0.25, end.y + 0.25, end.z);
  group.add(sprite);

  // in globale Gruppe
  ortsvektorGroup.add(group);

  // Referenz speichern (für später!)
  point.userData.ortsvektor = group;
}

//
// ✅ OPTIONAL (wird dir später extrem helfen)
//
export function toggleOrtsvektoren(visible) {
  if (!ortsvektorGroup) return;
  ortsvektorGroup.visible = visible;
}

//
// 🔧 bestehende helpers (unverändert)
//
function makeTextSprite(text) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  canvas.width = 512;
  canvas.height = 256;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = 'rgba(255,255,255,1)';
  ctx.font = 'bold 46px Arial';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 20, canvas.height / 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;

  const mat = new THREE.SpriteMaterial({ map: texture, transparent: true });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(0.95, 0.36, 1);

  return sprite;
}

function updateSprite(sprite, text) {
  if (!sprite?.material?.map?.image) return;

  const canvas = sprite.material.map.image;
  const ctx = canvas.getContext('2d');

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = 'rgba(255,255,255,1)';
  ctx.font = 'bold 46px Arial';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 20, canvas.height / 2);

  sprite.material.map.needsUpdate = true;
}
