import { VRButton } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/webxr/VRButton.js';
import { ARButton } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/webxr/ARButton.js';

export function initXR(renderer) {
  const vrBtn = VRButton.createButton(renderer);
  vrBtn.style.left = 'auto';
  vrBtn.style.right = 'auto';
  vrBtn.style.marginLeft = '0';
  vrBtn.style.left = 'calc(50% - 110px)';
  document.body.appendChild(vrBtn);

  // AR-Button nur anzeigen wenn das Gerät immersive-ar wirklich unterstützt
  // (Pico Neo 3 und reine VR-Brillen unterstützen es nicht → kein Button)
  if (navigator.xr) {
    navigator.xr.isSessionSupported('immersive-ar').then(supported => {
      if (!supported) return;
      const arBtn = ARButton.createButton(renderer, {
        optionalFeatures: ['dom-overlay'],
        domOverlay: { root: document.getElementById('ar-overlay') }
      });
      arBtn.style.left = 'calc(50% + 10px)';
      arBtn.style.marginLeft = '0';
      document.body.appendChild(arBtn);
    });
  }
}
