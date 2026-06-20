import { VRButton } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/webxr/VRButton.js';
import { ARButton } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/webxr/ARButton.js';

export function initXR(renderer) {
  const vrBtn = VRButton.createButton(renderer);
  // Three.js uses margin-left:-50px internally — reset it, then anchor left of center
  vrBtn.style.left = 'auto';
  vrBtn.style.right = 'calc(50% + 10px)';
  vrBtn.style.marginLeft = '0';
  document.body.appendChild(vrBtn);

  const arBtn = ARButton.createButton(renderer, {
    optionalFeatures: ['dom-overlay'],
    domOverlay: { root: document.getElementById('ar-overlay') }
  });
  arBtn.style.left = 'calc(50% + 10px)';
  arBtn.style.marginLeft = '0';
  document.body.appendChild(arBtn);
}
