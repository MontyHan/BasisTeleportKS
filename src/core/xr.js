import { VRButton } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/webxr/VRButton.js';
import { ARButton } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/webxr/ARButton.js';

export function initXR(renderer) {
  const vrBtn = VRButton.createButton(renderer);
  vrBtn.style.left = 'calc(50% - 90px)';
  vrBtn.style.transform = 'none';
  document.body.appendChild(vrBtn);

  const arBtn = ARButton.createButton(renderer, {
    optionalFeatures: ['dom-overlay'],
    domOverlay: { root: document.getElementById('ar-overlay') }
  });
  arBtn.style.left = 'calc(50% + 10px)';
  arBtn.style.transform = 'none';
  document.body.appendChild(arBtn);
}
