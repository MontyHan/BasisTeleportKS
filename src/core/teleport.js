import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

let controller;
let curveLine;
let marker;
let floor;
let raycaster = new THREE.Raycaster();
let rig; // ✅ NEU

export function initTeleport(renderer, scene, playerRig) {

    rig = playerRig; // ✅ speichern

    controller = renderer.xr.getController(0);

    // ✅ Controller an das Rig hängen (NICHT an scene!)
    rig.add(controller);

    // Linie
    curveLine = new THREE.Line(
        new THREE.BufferGeometry(),
        new THREE.LineBasicMaterial({ color:0x00ffcc })
    );
    scene.add(curveLine);

    // Marker
    marker = new THREE.Mesh(
        new THREE.CircleGeometry(0.25, 32),
        new THREE.MeshBasicMaterial({ color:0x00ffcc })
    );
    marker.rotation.x = -Math.PI/2;
    marker.visible = false;
    scene.add(marker);

    // Boden referenz holen
    floor = scene.children.find(o => o.type === "Mesh");

    controller.addEventListener('selectend', () => {
        if (marker.visible) {
            const p = marker.position;

            // ✅ RICHTIGES Teleportieren (rig bewegen)
            rig.position.set(p.x, 0, p.z);
        }
    });
}

export function updateTeleport() {

    if (!controller) return;

    let points = [];

    let pos = new THREE.Vector3().setFromMatrixPosition(controller.matrixWorld);
    let vel = new THREE.Vector3(0,0,-1)
        .applyQuaternion(controller.quaternion)
        .multiplyScalar(6);

    let hit = null;

    for (let i=0;i<30;i++) {

        points.push(pos.clone());

        vel.y -= 0.15;
        pos = pos.clone().add(vel.clone().multiplyScalar(0.1));

        raycaster.set(pos, new THREE.Vector3(0,-1,0));
        const h = raycaster.intersectObject(floor);

        if (h.length && h[0].distance < 0.2) {
            hit = h[0].point;
            break;
        }
    }

    curveLine.geometry.setFromPoints(points);

    if (hit) {
        marker.position.copy(hit);
        marker.visible = true;
    } else {
        marker.visible = false;
    }
}
