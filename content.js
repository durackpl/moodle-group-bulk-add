const STORAGE_KEY = 'MGAEnabled';
const OVERLAY_ID = 'MGA-extension-overlay';

async function readEnabledFlag() {
  const result = await browser.storage.local.get({ [STORAGE_KEY]: false });
  return Boolean(result[STORAGE_KEY]);
}

function ensureOverlay() {
  let overlay = document.getElementById(OVERLAY_ID);
    console.log("overlay value:");
  console.log(overlay);
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = OVERLAY_ID;
    overlay.innerHTML = `
      <div class="hw-panel">
        <textarea class="hw-textarea" rows="4" placeholder="Enter one student per line"></textarea>
      </div>
    `;
    document.documentElement.appendChild(overlay);
  }
  overlay.style.display = 'block';
}

function removeOverlay() {
  const overlay = document.getElementById(OVERLAY_ID);
  if (overlay) {
    overlay.remove();
  }
}

async function syncOverlayFromStorage() {
    const enabled = await readEnabledFlag();
    console.log("enable flag:");
    console.log(enabled);
  if (enabled) {
    ensureOverlay();
  } else {
    removeOverlay();
  }
}

browser.runtime.onMessage.addListener((message) => {
  if (message && message.type === 'toggle-overlay') {
    if (message.enabled) {
      ensureOverlay();
    } else {
      removeOverlay();
    }
  }
});

syncOverlayFromStorage();

console.log("content.js run!!!")
