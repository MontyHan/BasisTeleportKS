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
export function createGerade(scene, p1Math, p2Math, color = 0xffff00) {
  const a = new THREE.Vector3(p1Math.y, p1Math.z, p1Math.x);
  const b = new THREE.Vector3(p2Math.y, p2Math.z, p2Math.x);
  const dir = b.clone().sub(a).normalize();
  const start = a.clone().sub(dir.clone().multiplyScalar(10));
  const end   = a.clone().add(dir.clone().multiplyScalar(10));
  const geo = new THREE.BufferGeometry().setFromPoints([start, end]);
  const mat = new THREE.LineBasicMaterial({ color });
  const line = new THREE.Line(geo, mat);
  scene.add(line);
  return line;
}

// Richtungsvektor-Pfeil von p1 nach p2 (Mathebuch-Koordinaten), wird in parent eingefügt
export function createRichtungsvektor(parent, p1Math, p2Math, color = 0xff8800) {
  const a = new THREE.Vector3(p1Math.y, p1Math.z, p1Math.x);
  const b = new THREE.Vector3(p2Math.y, p2Math.z, p2Math.x);
  const dir = b.clone().sub(a);
  const length = dir.length();
  if (length < 0.001) return null;
  const arrow = new THREE.ArrowHelper(
    dir.normalize(), a, length, color,
    Math.min(length * 0.2, 0.4),
    Math.min(length * 0.1, 0.2)
  );
  parent.add(arrow);
  return arrow;
}
