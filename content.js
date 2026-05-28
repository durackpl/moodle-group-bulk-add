const STORAGE_KEY = 'MGAEnabled';

async function readEnabledFlag() {
  const result = await browser.storage.local.get({ [STORAGE_KEY]: false });
  return Boolean(result[STORAGE_KEY]);
}

async function readProcessingFlag() {
  const result = await browser.storage.local.get({ processing: false });
  return Boolean(result.processing);
}


function ensureOverlay(isProcessing, studentInput) {
    let $overlay = $("#MGAoverlay");

    if (!$overlay.length) {
        $overlay = $(`
      <div id="MGAoverlay" style="display: block">
        <div class="hw-panel">

          <textarea
            class="hw-textarea"
            id="MGA_inputTA"
            rows="10"
            cols="40"
            placeholder="Enter one student per line"
          ></textarea>

          <button class="hw-button" id="MGA_addBT">
            Bulk Add Students
          </button>

        </div>
      </div>
    `);

        $('body').append($overlay);

        $("#MGA_inputTA").val(studentInput);
        
        $("#MGA_inputTA").on("input", () => {
            browser.storage.local.set({
                studentInput: $("#MGA_inputTA").val()
            });
        });

        $("#MGA_addBT").on("click", () => {
            $("#MGA_addBT").prop("disabled", true);

            browser.storage.local
                .set({ processing: true })
                .then(continue_processing);
        });

        $overlay.show();
    }


    $("#MGA_addBT").prop("disabled", isProcessing);

    if (isProcessing) {
        continue_processing();
    }
}

function type_search_string(text) {
    return new Promise((resolve, reject) => {
        const $input = $("#addselect_searchtext");
        const $clearButton = $("#addselect_clearbutton");

        if (!$clearButton.length) {
            reject(new Error("No clear button"));
            return;
        }

        if (!$input.length) {
            reject(new Error("No input field"));
            return;
        }

        $clearButton.trigger("click");

        $input.focus();
        $input.val("");

        let index = 0;

        const interval = setInterval(() => {
            if (index >= text.length) {
                clearInterval(interval);
                // Trigger final change events
                $input[0].dispatchEvent(new Event("change", { bubbles: true }));
                resolve();
                return;
            }

            const ch = text.charAt(index);
            $input.val($input.val() + ch);

            // Trigger events so Moodle incremental search reacts
            $input[0].dispatchEvent(new Event("input", { bubbles: true }));
            $input[0].dispatchEvent(new KeyboardEvent("keyup", { bubbles: true }));

            index++;
        }, 50);
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

async function continue_processing() {
    const lines = await browser.storage.local.get("studentInput")
          .then((result) => result.studentInput.split("\n")
                .map(x => x.trim())
                .filter(x => x.length > 0));

    if (lines.length > 0) {

        const text = lines.shift();

        await browser.storage.local.set({
            studentInput: lines.join('\n')
        });

        await bulk_add(text);
        
    } else {
        $("#MGA_addBT").prop("disabled", true);
        await browser.storage.local.set({ processing : false });
    }
}

function bulk_add(text) {
    return type_search_string(text)
        .then(() => {
            return wait_for_unique_match(
                () => {
                    const $options = $("#addselect option");
                    return $options.length === 1 && !$options[0].disabled;
                },
                () => {
                    const $options = $("#addselect option");
                    return $options.length === 1 && $options[0].disabled;
                },
                100,
                2000
            );
        })
        .then(() => {

            $("#addselect option")[0].selected = true;
            // Notify Moodle selection changed
            $("#addselect")[0].dispatchEvent(new Event("change", { bubbles: true }));

            const $addButton = $("#add");
            if ($addButton.length) {
                $addButton[0].click();
            } else {
                throw new Error("No add button");
            }
        })
        .catch((e) => {
            console.log(e);
        });
}

function removeOverlay() {
  $("#MGAoverlay").remove();
}

function studentInput() {
    return browser.storage.local
        .get({ studentInput: "" })
        .then(({ studentInput }) => studentInput);
}

async function syncOverlayFromStorage() {
    const enabled = await readEnabledFlag();
  if (enabled) {
      ensureOverlay(await readProcessingFlag(), await studentInput());
  } else {
    removeOverlay();
  }
}





browser.runtime.onMessage.addListener(async (message) => {
  if (message && message.type === 'toggle-overlay') {
    if (message.enabled) {
        ensureOverlay(await readProcessingFlag(), await studentInput());
    } else {
        removeOverlay();
    }
  }
});

syncOverlayFromStorage();




