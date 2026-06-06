import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

let leftController;
let rightController;

export function initControllers(renderer, scene) {

    // 👉 Linker Controller (für UI)
    leftController = renderer.xr.getController(0);
    scene.add(leftController);

    // 👉 Rechter Controller (für Laser / später Interaction)
    rightController = renderer.xr.getController(1);
    scene.add(rightController);

    // ===== Laser für rechten Controller =====
    const geometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0,0,0),
        new THREE.Vector3(0,0,-1)
    ]);

    const line = new THREE.Line(
        geometry,
        new THREE.LineBasicMaterial({ color:0x00ffff })
    );
    line.scale.z = 10;

    rightController.add(line);

    // 👉 WICHTIG: beide zurückgeben
    return {
        left: leftController,
        right: rightController
    };
}

export function updateControllers() {
    // später für Auswahl / Hover etc.
}
