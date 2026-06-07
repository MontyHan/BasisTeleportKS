import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

let group;

export function initGrid(scene) {

    group = new THREE.Group();
    scene.add(group);

    const size = 20; // -10 bis +10
    const divisions = 20;

    // === GRID (Boden) ===
    const grid = new THREE.GridHelper(size, divisions, 0x444444, 0x888888);
    grid.position.y = 0;
    group.add(grid);

    // === SKALIERUNG ZAHLEN ===
    for (let i = -10; i <= 10; i++) {

        if (i === 0) continue;

        createLabel(i.toString(), new THREE.Vector3(i, 0, 0));
        createLabel(i.toString(), new THREE.Vector3(0, i, 0));
        createLabel(i.toString(), new THREE.Vector3(0, 0, i));
    }
}


// ===== TEXT SPRITE =====
function createLabel(text, position, color = 0xffffff) {

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    canvas.width = 256;
    canvas.height = 128;

    ctx.fillStyle = "white";
    ctx.font = "48px Arial";
    ctx.textAlign = "center";
    ctx.fillText(text, 128, 64);

    const texture = new THREE.CanvasTexture(canvas);

    const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
    const sprite = new THREE.Sprite(material);

    sprite.scale.set(0.8, 0.4, 1);
    sprite.position.copy(position);

    group.add(sprite);
}
