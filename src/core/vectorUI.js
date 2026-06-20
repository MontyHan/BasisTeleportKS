import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

let scene;
let ortsvektorGroup = null;

export function initVectorUI(s) {
  scene = s;
  ortsvektorGroup = new THREE.Group();
  ortsvektorGroup.visible = false;
  scene.add(ortsvektorGroup);
}

export function addOrtsvektorForPoint(point, x, y, z, index) {
  if (!ortsvektorGroup) return;

  const letter = String.fromCharCode(65 + (index % 26));

  // Letter sprite as child of point mesh — always visible, moves with point
  const letterSprite = makeLetterSprite(letter);
  letterSprite.position.set(0, 0.12, 0);
  point.add(letterSprite);

  // OV group (visibility controlled by toggle)
  const group = new THREE.Group();
  const start = new THREE.Vector3(0, 0, 0);
  const end = new THREE.Vector3(y, z, x); // math(x,y,z) → Three.js(y,z,x)

  const geo = new THREE.BufferGeometry().setFromPoints([start, end]);
  group.add(new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0x00ffcc })));

  const length = end.length();
  if (length > 0.001) {
    group.add(new THREE.ArrowHelper(end.clone().normalize(), start, length, 0x00ffcc, 0.2, 0.1));
  }

  const sprite = makeTextSprite(`${letter} = (${x}/${y}/${z})`);
  sprite.position.set(end.x + 0.25, end.y + 0.25, end.z);
  group.add(sprite);

  ortsvektorGroup.add(group);
  point.userData.ortsvektor = group;
}

export function toggleOrtsvektoren(visible) {
  if (ortsvektorGroup) ortsvektorGroup.visible = visible;
}

export function clearAllVectorUI() {
  if (!ortsvektorGroup) return;
  while (ortsvektorGroup.children.length > 0) {
    ortsvektorGroup.remove(ortsvektorGroup.children[0]);
  }
}

function makeLetterSprite(letter) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = 128; canvas.height = 128;
  ctx.clearRect(0, 0, 128, 128);
  ctx.fillStyle = '#ffff00';
  ctx.font = 'bold 80px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(letter, 64, 64);
  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true }));
  sprite.scale.set(0.25, 0.25, 1);
  return sprite;
}

function makeTextSprite(text) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = 512; canvas.height = 256;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = 'rgba(255,255,255,1)';
  ctx.font = 'bold 46px Arial';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 20, canvas.height / 2);
  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true }));
  sprite.scale.set(0.95, 0.36, 1);
  return sprite;
}
