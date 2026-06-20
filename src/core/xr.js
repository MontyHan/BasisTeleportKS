import { VRButton } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/webxr/VRButton.js';

export function initXR(renderer) {
  const vrBtn = VRButton.createButton(renderer, {
    requiredFeatures: ['local-floor']
  });
  // Three.js sets margin-left:-50px internally — reset and center properly
  vrBtn.style.left = '50%';
  vrBtn.style.marginLeft = '-50px';
  document.body.appendChild(vrBtn);
}
