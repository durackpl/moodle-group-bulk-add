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
    <textarea
      class="hw-textarea"
      rows="10"
      cols="40"
      placeholder="Enter one student per line"
    ></textarea>
    <button class="hw-button">
      Execute
    </button>
  </div>
`;

      document.documentElement.appendChild(overlay);

      const textarea = overlay.querySelector(".hw-textarea");
      const button = overlay.querySelector(".hw-button");

      // Restore saved content on load
      browser.storage.local.get("studentInput").then((result) => {
          if (result.studentInput) {
              textarea.value = result.studentInput;
          }
      });

      // Save content whenever the textarea changes
      textarea.addEventListener("input", () => {
          browser.storage.local.set({
              studentInput: textarea.value
          });
      });

      
// Button click handler
      button.addEventListener("click", () => {
          execute();
      });

      function execute() {
          console.log("Execute clicked");

          const lines = textarea.value
                .split("\n")
                .map(x => x.trim())
                .filter(x => x.length > 0);

          console.log(lines);
      }

      
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

console.log("content.js run!!!");


