const STORAGE_KEY = 'MGAEnabled';
const OVERLAY_ID = 'MGA-extension-overlay';

async function readEnabledFlag() {
  const result = await browser.storage.local.get({ [STORAGE_KEY]: false });
  return Boolean(result[STORAGE_KEY]);
}

function ensureOverlay() {
    let overlay = document.getElementById(OVERLAY_ID);
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
      Bulk Add Students
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
            bulk_add(textarea);
        });

    }
    overlay.style.display = 'block';
}

function type_search_string(text) {
    return new Promise((resolve, reject) => {

        const input = document.querySelector("#addselect_searchtext");
        const clearButton = document.querySelector("#addselect_clearbutton");

        if (!clearButton) {
            reject('No clear button');
        }

        if (!input) {
            reject('No input button');
        }

        clearButton.click();

        // Focus the field
        input.focus();

        // Clear existing value
        input.value = "";

        // Simulate typing character-by-character
        let index = 0;

        const interval = setInterval(() => {
            if (index >= text.length-1) {
                clearInterval(interval);

                // Trigger final change events
                input.dispatchEvent(new Event("change", { bubbles: true }));

                resolve();
            }

            input.value += text[index];

            // Trigger events so Moodle incremental search reacts
            input.dispatchEvent(new Event("input", { bubbles: true }));
            input.dispatchEvent(new KeyboardEvent("keyup", { bubbles: true }));

            index++;
        }, 80);

    });
}

function wait_for_unique_match(success, failure, interval, timeout) {

    let fid, tid;
    
    return new Promise((resolve, reject) => {

        fid = setTimeout(
            () => {
                reject("timeout");
            },
            timeout);

        tid = setInterval(
            () => {
                console.log('check for success');
                if (success()) {
                    resolve();
                }
                if (failure()) {
                    reject('no match');
                }	
            },
            interval);
        
    }).finally(() => {
        clearTimeout(fid);
        clearInterval(tid);
    });
}


function bulk_add(textarea) {
    const lines = textarea.value
          .split("\n")
          .map(x => x.trim())
          .filter(x => x.length > 0);

    if (lines.length > 0) {

        type_search_string(lines[0])
            .then(() => {
                return wait_for_unique_match(
                    () => {
                        const select = document.querySelector("#addselect");
                        const options = select ? select.querySelectorAll("option") : [];
                        return ((options.length == 1) && !options[0].disabled);
                    },
                    () => {
                        const select = document.querySelector("#addselect");
                        const options = select ? select.querySelectorAll("option") : [];
                        return ((options.length == 1) && options[0].disabled);
                    },
                    100,
                    5000);
            })
            .then(() => {
                
                const select = document.querySelector("#addselect");
                const options = select ? select.querySelectorAll("option") : [];
                const option = options[0];
                // Select the option
                option.selected = true;
                
                // Notify Moodle selection changed
                select.dispatchEvent(new Event("change", { bubbles: true }));
                const addButton = document.querySelector("#add");

                if (addButton) {
                    addButton.click();
                } else {
                    throw `No add button`;
                }
            })
            .catch(e => {
                console.log(e);
            });
    } else {
        console.log('No students names entered!');
    }
}

function removeOverlay() {
  const overlay = document.getElementById(OVERLAY_ID);
  if (overlay) {
    overlay.remove();
  }
}

async function syncOverlayFromStorage() {
    const enabled = await readEnabledFlag();
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




