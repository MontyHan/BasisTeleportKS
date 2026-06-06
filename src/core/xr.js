import { VRButton } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/webxr/VRButton.js';

export function initXR(renderer) {
    document.body.appendChild(VRButton.createButton(renderer));
}
