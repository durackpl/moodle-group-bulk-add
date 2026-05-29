const STORAGE_KEY = 'MGAEnabled';

async function getEnabled() {
  const result = await browser.storage.local.get({ [STORAGE_KEY]: false });
  return Boolean(result[STORAGE_KEY]);
}

function processingON() {
    localStorage.setItem("MGAprocessingON", "true");

    $("#MGA_addBT").prop("disabled", true);

    console.log("Processing ON");
}

function processingOFF() {
    localStorage.setItem("MGAprocessingON", "false");

    $("#MGA_addBT").prop("disabled", false);

    console.log("Processing OFF");
}

function isProcessingON() {
    return localStorage.getItem("MGAprocessingON") === "true";
}

function getReport() {
    return localStorage.getItem("MGAreport") || "";
}

function setReport(text) {
    localStorage.setItem("MGAreport", text);
    $("#MGA_reportTA").val(text);
}

function addToReport(text) {
    const report = getReport();

    setReport(
        report.length === 0
            ? text
            : report + "\n" + text
    );
}

function getInput() {
    return localStorage.getItem("MGAinput") || "";
}

function setInput(text, sync = true) {
    localStorage.setItem("MGAinput", text);
    if (sync) {
        $("#MGA_inputTA").val(text);
    }
}

function ensureOverlay() {

    const isProcessing = isProcessingON();
    const _input = getInput();
    const _report = getReport();

    let $overlay = $("#MGAoverlay");

    if (!$overlay.length) {
        $overlay = $(`
      <div id="MGAoverlay" style="display: block">
        <div class="hw-panel">

          <textarea
            class="hw-textarea"
            id="MGA_inputTA"
            rows="10"
            placeholder="Enter one student per line"
          ></textarea>

          <button class="hw-button" id="MGA_addBT">
            Bulk Add Students
          </button>

          <textarea
            class="hw-textarea"
            id="MGA_reportTA"
            rows="10"
            readonly
          ></textarea>

        </div>
      </div>
    `);

        $('body').append($overlay);

        $("#MGA_inputTA").val(_input);
        $("#MGA_reportTA").val(_report);
        
        $("#MGA_inputTA").on("input", () => setInput($("#MGA_inputTA").val(), false));

        $("#MGA_addBT").on("click", () => {
            processingON();
            setReport("Processing started...");
            continue_processing();
        });

        $overlay.show();
    }


    console.log(`Processing: ${isProcessing}`);
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

function wait_for_unique_match(success, failure, match, interval, timeout) {

    let fid, tid;
    
    return new Promise((resolve, reject) => {

        fid = setTimeout(
            () => {
                reject(`timeout (non unique match) on ${match}`);
            },
            timeout);

        tid = setInterval(
            () => {
                if (success()) {
                    resolve();
                }
                if (failure()) {
                    reject(`no match on ${match}`);
                }	
            },
            interval);
        
    }).finally(() => {
        clearTimeout(fid);
        clearInterval(tid);
    });
}

async function continue_processing() {
    /*
     * Process the next pending name from the saved textarea content.
     *
     * Steps:
     * 1. Load the saved multiline input from browser.storage.local.
     * 2. Split it into non-empty trimmed lines.
     * 3. If there are no lines left, stop processing and re-enable the UI.
     * 4. Otherwise remove the first line from the queue, save the remainder,
     *    and try to select that name in Moodle.
     * 5. If the name is successfully selected, click the Add button to reload
     *    the page and continue with the next name.
     * 6. If an error occurs, log it to the report and recurse so the next name
     *    can still be attempted.
     */

    const lines = getInput().split("\n")
          .map(x => x.trim())
          .filter(x => x.length > 0);

    if (lines.length === 0) {
        addToReport("...Processing finished");
        processingOFF();
        return;
    }

    const $addButton = $("#add");
    if (!$addButton.length) {
        throw new Error("No add button");
    }

    try {
        const text = lines.shift();

        // Save the remaining queue before the page reloads.
        setInput(lines.join("\n"));

        // Try to find and select the matching user for this line.
        // This function is expected to throw if there is no match or no unique match.
        await select_name_to_add_to_group(text);

        console.log(`added: ${text}`);
        addToReport(`added: ${text}`);

        // Reloads the page by submitting the Moodle add action.
        $addButton[0].click();

    } catch (e) {
        addToReport(`error: ${e}`);
        console.log(e);

        // Retry with the next pending line after an error.
        await continue_processing();
    }
}

function select_name_to_add_to_group(text) {
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
                text,
                100,
                2000
            );
        })
        .then(() => {

            $("#addselect option")[0].selected = true;
            // Notify Moodle selection changed
            $("#addselect")[0].dispatchEvent(new Event("change", { bubbles: true }));

        });
}

function removeOverlay() {
  $("#MGAoverlay").remove();
}

async function syncOverlayFromStorage() {
    const enabled = await getEnabled();
  if (enabled) {
      ensureOverlay();
  } else {
    removeOverlay();
  }
}

browser.runtime.onMessage.addListener(async (message) => {
  if (message && message.type === 'toggle-overlay') {
    if (message.enabled) {
        ensureOverlay();
    } else {
        removeOverlay();
    }
  }
});

syncOverlayFromStorage();




