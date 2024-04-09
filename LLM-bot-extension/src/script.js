let observer = null;
var llmResponse = "";
var currentComment;
var url = 'http://127.0.0.1:80/';
var promptID = null;
var token = '';
var googleGemma2b = 'google/gemma-2b-it';
var stabilityAi2b = 'stabilityai/stable-code-instruct-3b';
const defaultLLMs = ['google/gemma-2b-it', 'stabilityai/stable-code-instruct-3b', 'codellama/CodeLlama-7b-Instruct-hf'];


// ---------- LISTENERS ----------

window.addEventListener('popstate', setupNav);
window.addEventListener('hashchange', setupNav);
document.addEventListener('pjax:end', setupNav);

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupNav);
} else {
    setupNav();
}

// Extension listener
document.addEventListener('DOMContentLoaded', async function () {
    //Check if on github
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        if (tabs && tabs[0] && tabs[0].url) {
            const currentURL = tabs[0].url;
            if (currentURL.includes("github.com")) {
                document.getElementById('content').style.display = 'block';
                updateHuggingFaceTokenIcon();
                updateGitHubTokenIcon();
            } else {
                document.getElementById('message').style.display = 'block';
            }
        } else {
            console.error("No tabs were found.");
        }
    });

    //Add settings
    addReformToggle();
    addStatusToggle();
    addReviewsToggle()
    addCodeToggle()
    addRelevanceToggle()
    addToxicToggle()
    initializeLlmDropdown()
    addEventLoadLLM()
    addEventDeleteLLM()
    addEventGithubSaveToken()
    addEventHuggingFaceSaveToken()
    addEventSaveCustomLLM()
});

// Toggle state listener
chrome.runtime.onMessage.addListener(async function (request, sender, sendResponse) {
    let icon = document.getElementById('LLM_Icon');
    //Update toggle state
    if (icon && (request.toggleState == true || request.toggleState == false)) {
        icon.style.display = request.toggleState ? 'block' : 'none';
        let state = request.toggleState ? "checked" : "not_checked";
        try {
            await chrome.storage.sync.set({ 'toggleState': state });
            updateIconVisibility()

        } catch (error) {
            console.log("Error:", error);
        }
    }

    //Handle toggle reform comment state
    let copyButton = document.getElementById("copySuggestion");
    if (copyButton && request.toggleReform != null) {
        if (request.toggleReform) {
            copyButton.style.display = "flex";
        } else if (!request.toggleReform) {
            copyButton.style.display = "none";
        }
    }

    //Update Icon when changing tabs 
    if (request.action === "updateIconOnTabChange") {
        updateIconVisibility();
        sendResponse({ result: "UpdatedIcon" });
    }

    return true;
});




// ---------- GENERAL FUNCTIONS ----------

// Watch changes in the DOM
function observeDOM() {
    if (observer) {
        observer.disconnect();
    }
    observer = new MutationObserver(mutations => {
        mutations.forEach(mutation => {
            if (mutation.type === "childList" && mutation.addedNodes.length) {
                checkIcon();
                attachCopyEvent();
            }
        });
    });
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
}

// Watch changed when selecting differents tabs in github Single Application Page (SAP)
async function setupNav() {
    observeDOM();
    checkIcon();
    attachTextAreaEvent();
    attachCopyEvent();
    updateIconVisibility();
}




// ---------- ICONS FUNCTIONS ----------

// Check if icon exists
function checkIcon() {
    const newCommentField = document.getElementById("new_comment_field");
    let icon = document.getElementById("LLM_Icon");
    if (newCommentField && !icon) {
        addIconOverCommentBox();
        createModal();
    }
    if (icon) {
        attachIconEvent(icon);
    }
}

// Add Icon over github comment box
async function addIconOverCommentBox() {
    let textarea = document.getElementById("new_comment_field");
    if (textarea) {
        try {
            //add a function to add the text area
            add_LLM_Reply_Area();
            //Creating the LLM icon
            let icon = document.createElement('img');
            icon.id = "LLM_Icon";
            icon.alt = "Icon";
            icon.src = chrome.runtime.getURL("icon/logo-nath-48.png");



            icon.onmouseover = function () {
                this.style.transform = "translateY(-10%) scale(1.1)";
            };
            icon.onmouseout = function () {
                this.style.transform = "translateY(-10%) scale(1)";
            };

            icon.style.cssText = `
                pointer-events: auto;
                cursor: pointer;
                position: absolute;
                right: 10px;
                top: 50%;
                transform: translateY(-10%);
                z-index: 1000;`
                ;

            attachIconEvent(icon);

            textarea.parentElement.style.position = "relative";
            textarea.parentElement.appendChild(icon);
            updateIconVisibility();
        } catch (error) {
        }
    }
}

// LLMResponse setter
function saveLLMResponse(input) {
    llmResponse = input;
}

// LLMResponse getter
function getLLMResponse() {
    return llmResponse;
}

// Get the response from local storage
async function getResponse() {
    return new Promise((resolve, reject) => {
        try {
            chrome.storage.local.get('llmResponse', function (result) {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                } else {
                    resolve(result['llmResponse']);
                }
            });
        } catch (error) { }
    });
}

function createModal() {
    let commentForm = document.getElementById("new_comment_form");
    if (commentForm) {
        const modal = document.createElement('section');
        modal.classList.add('modal');
        modal.classList.add('hidden');
        modal.setAttribute("id","request-modal");
        const modalContent = document.createElement('div');
        modalContent.classList.add('flex');
        modalContent.classList.add('request-content');
        modalContent.innerHTML = 'This approach combines HTML for structure, CSS for styling, and JavaScript for functionality, providing a complete solution for creating a modal. The modal can contain any HTML elements, such as divs, headings, paragraphs, images, etc., as mentioned in the sources 23. The modal is initially hidden using the .hidden class, and JavaScript is used to remove this class when the modal should be displayed, and to add it back when the modal should be hidden';
        modal.appendChild(modalContent);
        const overlay = document.createElement('div');
        overlay.classList.add('overlay');
        overlay.classList.add('hidden');
        overlay.setAttribute("id","request-overlay");
        commentForm.parentElement.appendChild(modal);
        commentForm.parentElement.appendChild(overlay);
    }
}

function openModal() {
    let modal = document.getElementById("request-modal");
    let overlay = document.getElementById("request-overlay");
    let modalContent = document.getElementById("request-content");
    
    modal.classList.remove("hidden");
    overlay.classList.remove("hidden");
}

// Attach onclick event on LLM Icon
function attachIconEvent(icon) {
    icon.onmouseover = function () {
        this.style.transform = "translateY(-10%) scale(1.1)";
    };
    icon.onmouseout = function () {
        this.style.transform = "translateY(-10%) scale(1)";
    };
    icon.onclick = async function (event) {

        openModal();

        chrome.runtime.sendMessage({
            from: 'popup',
            subject: 'llmResponse',
            response: "No response to display"
        });
        event.stopPropagation();
        var popup = document.getElementById('popup-llm');
        if (popup.style.display === 'none') {
            popup.style.display = 'flex';
            let resBox = document.getElementById("llm-response");

            //Add a buffering effect to the response box
            let dotCount = 0;
            const maxDots = 3;
            const interval = 500;

            const intervalId = setInterval(() => {
                dotCount = (dotCount + 1) % (maxDots + 1);
                resBox.value = "Waiting for LLM response " + ".".repeat(dotCount);
            }, interval);

            //Call new function HERE but keep old commented
            try {
                let promptsResponses = await createPrompts();

                console.log('promptsResponses bellow');
                console.log(promptsResponses);
                clearInterval(intervalId); // Stop the buffering effect
                // Process and display the responses
                resBox.value = promptsResponses.join('\n');

                // Send the result to the background page or wherever it's needed
                chrome.runtime.sendMessage({
                    from: 'popup',
                    subject: 'llmResponse',
                    response: promptsResponses
                });
                } catch (error) {
                console.error(error);
                clearInterval(intervalId);
                resBox.value = "Error: Could not get a response.";
            }
        } else {
            popup.style.display = 'none';
        }
        updateIconVisibility();
    };
}

// Update the visibility of the LLM Icon
async function updateIconVisibility() {
    var icon = document.getElementById("LLM_Icon");
    var textarea = document.getElementById("popup-llm")
    let currrentState = "";
    if (icon) {
        try {
            currrentState = await getToggleState('toggleState');
            if (currrentState === "checked") {
                icon.style.display = 'block';
            } else {
                icon.style.display = 'none';
                textarea.style.display = 'none';
            }
        } catch (error) {
            console.log("Error:", error);
        }
    }
}



// ---------- TOGGLES FUNCTIONS ----------

// Get the state enable/disable of the extension
async function getToggleState(key) {
    return new Promise((resolve, reject) => {
        try {
            chrome.storage.sync.get([key], function (result) {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                } else {
                    resolve(result[key]);
                }
            });
        } catch (error) {
        }
    });
}

// Add reformulate toggle
async function addReformToggle() {
    let lswitch = document.getElementById('reformulationSwitch');
    let currrentState = "";
    let toggle = document.createElement("input");

    try {
        currrentState = await getToggleState('toggleReform');
        if (!currrentState) {
            chrome.runtime.sendMessage({
                from: 'popup',
                subject: 'toggleReform',
                toggleReform: toggle.checked
            });
            currrentState = await getToggleState('toggleReform');
        }
    } catch (error) {
        console.log("Error:", message);
    }

    toggle.type = "checkbox";
    toggle.id = "toggleReform";

    let slider = document.createElement("span");
    slider.classList = "slider round";

    if (lswitch) {
        if (currrentState === "checked") {
            toggle.checked = true;
        } else {
            toggle.checked = false;
        }
        lswitch.appendChild(toggle);
        lswitch.appendChild(slider);
        toggle.addEventListener('change', function () {
            chrome.runtime.sendMessage({
                from: 'popup',
                subject: 'toggleReform',
                toggleReform: toggle.checked
            });
        });
    }
}

// Add enable/disable toggle
async function addStatusToggle() {
    let lswitch = document.getElementById('enableSwitch');
    let currrentState = "";
    let toggle = document.createElement("input");

    try {
        currrentState = await getToggleState('toggleState');
        if (!currrentState) {
            chrome.runtime.sendMessage({
                from: 'popup',
                subject: 'toggleState',
                toggleState: toggle.checked
            });
            currrentState = await getToggleState('toggleState');
        }
    } catch (error) {
        console.log("Error:", message);
    }

    toggle.type = "checkbox";
    toggle.id = "toggleExtension";

    let slider = document.createElement("span");
    slider.classList = "slider round";

    if (lswitch) {
        if (currrentState === "checked") {
            toggle.checked = true;
            document.getElementById('Settings').style.display = "block";
        } else {
            toggle.checked = false;
            document.getElementById('Settings').style.display = "none";
        }
        lswitch.appendChild(toggle);
        lswitch.appendChild(slider);
        toggle.addEventListener('change', function (e) {
            chrome.runtime.sendMessage({
                from: 'popup',
                subject: 'toggleState',
                toggleState: toggle.checked
            });
            if (e.target.checked) {
                document.getElementById('Settings').style.display = "block";
            } else {
                document.getElementById('Settings').style.display = "none";
            }
        });
    }
}

// Add code toggle
async function addCodeToggle() {
    let lswitch = document.getElementById('codeSwitch');
    let currrentState = "";
    let toggle = document.createElement("input");

    try {
        currrentState = await getToggleState('toggleCode');
        if (!currrentState) {
            chrome.runtime.sendMessage({
                from: 'popup',
                subject: 'toggleCode',
                toggleReform: toggle.checked
            });
            currrentState = await getToggleState('toggleCode');
        }
    } catch (error) {
        console.log("Error:", message);
    }

    toggle.type = "checkbox";
    toggle.id = "toggleCode";

    let slider = document.createElement("span");
    slider.classList = "slider round";

    if (lswitch) {
        if (currrentState === "checked") {
            toggle.checked = true;
        } else {
            toggle.checked = false;
        }
        lswitch.appendChild(toggle);
        lswitch.appendChild(slider);
        toggle.addEventListener('change', function(e) {
            chrome.runtime.sendMessage({
                from: 'popup',
                subject: 'toggleCode',
                toggleCode: toggle.checked
            });
            if (e.target.checked) {
                alert("This option can significantly slow down the response generation if there are too many files.");
            }
        });
    }
}

// Add reviews toggle
async function addReviewsToggle(){
    let lswitch = document.getElementById('reviewsSwitch');
    let currrentState = "";
    let toggle = document.createElement("input");

    try {
        currrentState = await getToggleState('toggleReviews');
        if (!currrentState){
            chrome.runtime.sendMessage({
                from: 'popup',
                subject: 'toggleReviews',
                toggleReform: toggle.checked
            });
            currrentState = await getToggleState('toggleReviews');
        }
    } catch (error) {
        console.log("Error:",message);
    }

    toggle.type = "checkbox";
    toggle.id = "toggleReviews";
    
    let slider = document.createElement("span");
    slider.classList = "slider round";

    if (lswitch) {
        if (currrentState === "checked") {
            toggle.checked = true;
        } else {
            toggle.checked = false;
        }    
        lswitch.appendChild(toggle);
        lswitch.appendChild(slider);
        toggle.addEventListener('change', function() {
            chrome.runtime.sendMessage({
                from: 'popup',
                subject: 'toggleReviews',
                toggleReviews: toggle.checked
            });
        });
    }
}

// Add relevance toggle
async function addRelevanceToggle() {
    let lswitch = document.getElementById('relevanceSwitch');
    let currrentState = "";
    let toggle = document.createElement("input");

    try {
        currrentState = await getToggleState('toggleRelevance');
        if (!currrentState) {
            chrome.runtime.sendMessage({
                from: 'popup',
                subject: 'toggleRelevance',
                toggleReform: toggle.checked
            });
            currrentState = await getToggleState('toggleRelevance');
        }
    } catch (error) {
        console.log("Error:", message);
    }

    toggle.type = "checkbox";
    toggle.id = "toggleRelevance";

    let slider = document.createElement("span");
    slider.classList = "slider round";

    if (lswitch) {
        if (currrentState === "checked") {
            toggle.checked = true;
        } else {
            toggle.checked = false;
        }
        lswitch.appendChild(toggle);
        lswitch.appendChild(slider);
        toggle.addEventListener('change', function () {
            chrome.runtime.sendMessage({
                from: 'popup',
                subject: 'toggleRelevance',
                toggleRelevance: toggle.checked
            });
        });
    }
}

// Add toxicity toggle
async function addToxicToggle() {
    let lswitch = document.getElementById('toxicitySwitch');
    let currrentState = "";
    let toggle = document.createElement("input");

    try {
        currrentState = await getToggleState('toggleToxicity');
        if (!currrentState) {
            chrome.runtime.sendMessage({
                from: 'popup',
                subject: 'toggleToxicity',
                toggleReform: toggle.checked
            });
            currrentState = await getToggleState('toggleToxicity');
        }
    } catch (error) {
        console.log("Error:", message);
    }

    toggle.type = "checkbox";
    toggle.id = "toggleToxicity";

    let slider = document.createElement("span");
    slider.classList = "slider round";

    if (lswitch) {
        if (currrentState === "checked") {
            toggle.checked = true;
        } else {
            toggle.checked = false;
        }
        lswitch.appendChild(toggle);
        lswitch.appendChild(slider);
        toggle.addEventListener('change', function () {
            chrome.runtime.sendMessage({
                from: 'popup',
                subject: 'toggleToxicity',
                toggleToxicity: toggle.checked
            });
        });
    }
}

// ---------- LLM CHANGE FUNCTIONS ----------


function initializeLlmDropdown() {
    chrome.storage.sync.get({ customLlms: [] }, function (result) {
        const llmDropdown = document.getElementById('llm_selected');
        result.customLlms.forEach(llmId => {
            const newOption = new Option(llmId, llmId, false, false);
            llmDropdown.add(newOption, undefined);
        });
    });
}

async function addEventLoadLLM() {
    document.getElementById("llm_change_button").addEventListener("click", async function () {
        var selectedValue = document.getElementById("llm_selected").value;

        alert("Changing LLM please wait... look at console to see when llm is saved")
        try {
            // Make a GET request to FastAPI server
            const response = await fetch(url + `changeLLM/?data=${selectedValue}`);
            //const response = await fetch(`http://127.0.0.1/premierdem`)
            const data = await response.json()
            alert('LLM loaded sucessfully');
            chrome.storage.sync.set({ "selectedLlmId": selectedValue }, function() {
                console.log('The LLM ID has been saved.');
            });
        } catch (error) {
            console.error('Error:', error)
            alert('Error:', error)
        }
    });
}

function addEventDeleteLLM() {
    document.getElementById("llm_delete_button").addEventListener("click", async function () {
        var selectedValue = document.getElementById("llm_selected").value;
        // Define default LLMs for comparison
        //const defaultLLMs = ['google/gemma-2b-it', 'stabilityai/stable-code-instruct-3b', 'codellama/CodeLlama-7b-Instruct-hf'];

        // Check if selected value is not a default LLM
        if (!defaultLLMs.includes(selectedValue)) {
            try {
                // Remove the option from the dropdown
                var select = document.getElementById("llm_selected");
                select.removeChild(select.options[select.selectedIndex]);

                // Update Chrome storage
                chrome.storage.sync.get({ customLlms: [] }, function (result) {
                    const filteredCustomLlms = result.customLlms.filter(llm => llm !== selectedValue);
                    chrome.storage.sync.set({ customLlms: filteredCustomLlms }, function () {
                        console.log('Custom LLM removed:', selectedValue);
                        alert('Custom LLM removed');
                    });
                });
            } catch (error) {
                console.error('Error:', error);
            }
        } else {
            console.log('Cannot remove a default LLM');
            alert('Cannot remove a default LLM');
        }
    });
}

function addEventSaveCustomLLM() {
    document.getElementById("custom_llm_save").addEventListener("click", async function () {
        var selectedValue = document.getElementById("custom_llm").value.trim();
        if (!selectedValue) {
            return;
        }

        try {
            chrome.storage.sync.get({ customLlms: [] }, function (result) {
                const customLlms = result.customLlms;
                // Check if the LLM ID is already saved
                if (!customLlms.includes(selectedValue)) {
                    customLlms.push(selectedValue); // Add the new LLM ID
                    chrome.storage.sync.set({ customLlms: customLlms }, function () {
                        console.log('Adding Custom LLM', selectedValue);
                        alert('Adding Custom LLM');
                        // Add the new LLM ID to the dropdown
                        const llmDropdown = document.getElementById('llm_selected');
                        const newOption = new Option(selectedValue, selectedValue, false, false);
                        llmDropdown.add(newOption, undefined);

                        // Optionally, clear the input field
                        document.getElementById("custom_llm").value = "";
                    });
                } else {
                    alert("This LLM ID is already added.");
                }
            });
        } catch (error) {
            console.error('Error:', error);
        }
    });
}




// ---------- TEXTAREA FUNCTIONS ----------

// Add Textarea related to icon click
async function add_LLM_Reply_Area() {
    let parentNode = document.getElementById("partial-new-comment-form-actions");
    if (!parentNode) {
        console.error("Div not found for textArea");
        return;
    }

    const divNode = document.createElement("div");
    divNode.id = "popup-llm";
    divNode.style.cssText = `
        display: none; 
        justify-content: space-between;
        align-items: center;
        margin-right: 2px;
        width: 100%;
        resize:none;
    `;

    divNode.innerHTML = `
        <div style="flex-grow: 1;margin-right: 4px; margin-top:2px;">
            <textarea readonly id="llm-response" class="Box" style="border: 2px solid #3b7fac; min-height:32px; height:35px; width: 100%; resize:vertical; margin-right:2px;">Waiting for LLM response ... </textarea>
        </div>
        <div>
            <button type="button" class="preview_button btn-primary btn" id="copySuggestion"style="margin-right:2px;background-color:#3b7fac;">Copy</button>
        </div>
    `;
    parentNode.children[0].style.width = "-webkit-fill-available";

    parentNode.children[0].prepend(divNode);

    //Check for reform state for copy button
    let copyButton = document.getElementById("copySuggestion");
    let reformState = await getToggleState("toggleReform");
    if (copyButton && reformState != null) {
        if (reformState === "checked") {
            copyButton.style.display = "flex";
        } else if (reformState === "not_checked") {
            copyButton.style.display = "none";
        }
    }
}

// Copy text
function copyToClipboard() {
    const text = document.getElementById('llm-response').value;
    if (text) {
        navigator.clipboard.writeText(text).then(() => { }).catch(error => {
            console.error('Can\'t copy text: ', error);
        });
    }
}

// Add copy button event listener
function attachCopyEvent() {
    if (document.getElementById("copySuggestion")) {
        document.addEventListener('click', function (event) {
            if (event.target.id === 'copySuggestion') {
                event.preventDefault();
                copyToClipboard();
            }
        });
    }
}

// Add text area event listener
function attachTextAreaEvent() {
    let textarea = document.getElementById("new_comment_field");
    if (textarea) {
        //EventListeners for when user gets out of textarea
        textarea.addEventListener('change', function (event) {
            updateTextArea(event.target.value);
            // if(textarea){
            //     textarea.style.display = "none";
            // }
        });
        textarea.addEventListener('blur', function (event) {
            updateTextArea(event.target.value);
            //  if(textarea){
            //     textarea.style.display = "none";
            // }
        });

        //EventListeners for when user is done writing, get the text is delayed
        textarea.addEventListener('input', getTextOvertime(function (event) {
            updateTextArea(event.target.value);
            if (event.target.value.length == 0) {
                resBox.value = "Waiting on LLM to review comment";
            }
        }), 1000);


    }
}

// Delay the get of the input
function getTextOvertime(func, waitingFunc) {
    let time;
    return function execute(...args) {
        const overtime = function () {
            clearTimeout(time);
            func(...args);
        };
        clearTimeout(time);
        time = setTimeout(overtime, waitingFunc)
    }
}

// Save with given texte
async function updateTextArea(input) {
    setCurrentComment(input);
}

// Currentcomment setter
function setCurrentComment(input) {
    currentComment = input;
}

// Currentcomment getter
function getCurrentComment() {
    return currentComment;
}

// ----------  HUGGING FACE API FUNCTIONS ---------- 

function setHuggingFaceToken(userToken) {
    // Save the token to chrome.storage
    chrome.storage.sync.set({ 'huggingFaceToken': userToken }, function () {
        console.log('Hugging Face Token is saved');
        updateHuggingFaceTokenIcon();
    });
    // Use the token immediately if needed
}

function updateHuggingFaceTokenIcon() {
    chrome.storage.sync.get('huggingFaceToken', function (result) {
        if (result.huggingFaceToken) {
            // Token found, display green check
            document.getElementById('hugging_face_icon').textContent = '✅'; // Replace with your icon for success
            document.getElementById('hugging_face_icon').className = 'icon-success';
        } else {
            // Token not found, display red X
            document.getElementById('hugging_face_icon').textContent = '❌'; // Replace with your icon for failure
            document.getElementById('hugging_face_icon').className = 'icon-fail';
        }
    });
}


function addEventHuggingFaceSaveToken() {
    let saveButton = document.getElementById("hugging_face_token_save");
    saveButton.addEventListener("click", async () => {
        let tokenText = document.getElementById("hugging_face_token");
        if (tokenText.value) {
            setHuggingFaceToken(tokenText)
            try {
                // Make a GET request to FastAPI server
                const response = await fetch(url + `setHuggingFaceToken/?data=${tokenText.value}`);
                const data = await response.json()
            } catch (error) {
                console.error('Error:', error)
            }
        }
    });
}


// ----------  GITHUB API FUNCTIONS ---------- 

function setGitHubToken(userToken) {
    // Save the token to chrome.storage
    chrome.storage.sync.set({ 'githubToken': userToken }, function () {
        console.log('GitHub Token is saved');
        updateGitHubTokenIcon();
    });
    // Update the local variable if needed for immediate use
    token = userToken;
}

// Token getter
function getToken() {
    return token;
}

// Add event listener to watch when token is saved
function addEventGithubSaveToken() {
    let saveButton = document.getElementById("github_token_save");
    saveButton.addEventListener("click", async () => {
        let tokenText = document.getElementById("github_token");
        if (tokenText.value) {
            setGitHubToken(tokenText.value);
        }
    });
}

function updateGitHubTokenIcon() {
    chrome.storage.sync.get('githubToken', function (result) {
        if (result.githubToken) {
            document.getElementById('github_icon').textContent = '✅'; // Replace with your icon for success
            document.getElementById('github_icon').className = 'icon-success';
        } else {
            document.getElementById('github_icon').textContent = '❌'; // Replace with your icon for failure
            document.getElementById('github_icon').className = 'icon-fail';
        }
    });
}



function loadGitHubToken() {
    return new Promise((resolve, reject) => {
        chrome.storage.sync.get('githubToken', function (result) {
            if (result.githubToken) {
                token = result.githubToken;
                console.log('GitHub Token loaded:', result.githubToken);
                resolve(result.githubToken);
            } else {
                reject('No GitHub Token found');
            }
        });
    });
}

// Get pull request comments 
async function getPullRequestComments() {
    await loadGitHubToken()
    var headers = {
        'Authorization': `token ${token}`,
    }
    if (token) {
        try {
            var urlInfo = getInfoFromURL();
            const url = `https://api.github.com/repos/${urlInfo.owner}/${urlInfo.repo}/issues/${urlInfo.pullNumber}/comments`;
            const response = await fetch(url, { headers: headers });
            if (!response.ok) {
                throw new Error(`Error: ${response.status}`);
            }
            const data = await response.json(); 
            const comments = data.map(async comment => {
                if (comment.user.login != "github-actions[bot]") {
                    return comment.body;
                }
            });
            return Promise.all(comments);
        } catch (error) {
            console.log(error);
        }
    } else {
        alert("PR-Comments : No Personal access token detected!")
    }
}

// Get pull request reviews 
async function getPullRequestReviews() {
    await loadGitHubToken()
    var headers = {
        'Authorization': `token ${token}`,
    }
    if (token) {
        try {
            var urlInfo = getInfoFromURL();
            const url = `https://api.github.com/repos/${urlInfo.owner}/${urlInfo.repo}/pulls/${urlInfo.pullNumber}/comments`;
            const response = await fetch(url, { headers: headers });
            if (!response.ok) {
                throw new Error(`Error: ${response.status}`);
            }
            const data = await response.json(); 
            const reviews = data.map(async review => {
                if (!review.in_reply_to_id) {
                    return `code en revue : ${review.diff_hunk}\ncommentaire : ${review.body}`;
                }
            });
            return Promise.all(reviews);
        } catch (error) {
            console.log(error);
        }
    }else{
        alert("PR-Reviews : No Personal access token detected!")
    }
}



// Extract info from URL to get all necessary data
function getInfoFromURL() {
    const currentUrl = window.location.href;
    const regex = /https:\/\/github\.com\/([^\/]+)\/([^\/]+)\/pull\/(\d+)/;
    const match = currentUrl.match(regex);
    if (match) {
        const owner = match[1];
        const repo = match[2];
        const pullNumber = match[3];
        return {
            owner: owner,
            repo: repo,
            pullNumber: pullNumber
        };
    } else {
        return null;
    }
}

// Get modified or added files url from Github
async function getPullRequestFiles() {
    await loadGitHubToken()
    var headers = {
        'Authorization': `token ${token}`,
    }
    if (token) {
        try {
            var urlInfo = getInfoFromURL();
            const url = `https://api.github.com/repos/${urlInfo.owner}/${urlInfo.repo}/pulls/${urlInfo.pullNumber}/files`;
            const response = await fetch(url, { headers: headers });
            if (!response.ok) {
                throw new Error(`HTTP Error: ${response.status}`);
            }
            const files = await response.json();
            return files;
        } catch (error) {
        }
    } else {
        alert("PR-FILES : No Personal access token detected!")
    }
}

// Get clean comments
function getAllPullRequestComments() {
    return getPullRequestComments().then(comments => {
        if (comments) {
            console.log("getAllPullRequestComments : " + comments);
            return comments;
        }
        return [];
    });
}

// Get clean comments
function getAllPullRequestReviews(){
    return getPullRequestReviews().then(reviews => {
        if (reviews) {
            return reviews;
        }
        return [];
    });
}

//Return an array of strings that contains, filename: + patch
async function getAllFileContent() {
    console.log("Entering getAllFileContentUpdated");
    let files = await getPullRequestFiles();
    if (!files || files.length === 0) {
        console.log("No files found or an error occurred.");
        return [];
    }
    let filesWithPatches = files.map(file => {
        if (file.patch) {
            return `filename: ${file.filename}\npatch: ${file.patch}`;
        } else {
            return `filename: ${file.filename}\npatch: No changes or binary file`;
        }
    });
    console.log("Modified files with content:", filesWithPatches);
    return filesWithPatches;
}



// ----------  PROMPT FUNCTION WHEN BUTTON CLICKED ---------- 
async function createPrompts() {
    var basePrompt = "You are a helper bot that is assisting a programmer writing a reply to a pull request.";
    // Start timer
    let startTime = performance.now();
    let comments = await getAllPullRequestComments();
    console.log("Comments before if:" + comments);
    if (comments) {
        basePrompt += "Here are the previous comments made on a Pull request : \n";
        comments.forEach(comment => {
            basePrompt += comment + "\n";
        });
    }
    // Include files changed
    let codeState = await getToggleState('toggleCode');
    if (codeState === 'checked') {
        basePrompt += "Here are the file names and code affected by this pull request : \n";
        let fileContents = await getAllFileContent();
        if (fileContents.length > 0) {
            fileContents.forEach(fileContent => {
                basePrompt += fileContent + "\n";
            });
        } else {
            basePrompt += "No file changes are available for this pull request.\n";
        }
        basePrompt += "End of code section.\n";
    }
    // Inlcude reviews
    let reviewsState = await getToggleState('toggleReviews');
    if (reviewsState === 'checked') {
        let reviews = await getAllPullRequestReviews();
        if (reviews) {
            basePrompt += "Here are the reviews made on the pull request : \n";
            reviews.forEach(review => {
                basePrompt += review + "\n";
            });
        }
        basePrompt += "End of reviews.\n";
    }
    let pendingComment = getCurrentComment();
    basePrompt += "Here is the pending reply : " + pendingComment + "\n";


    let promptsResponsesArray = [];
    if (typeof pendingComment === 'string' && pendingComment.trim() !== "") {
        console.log("Entering Prompt making");
        let relevanceState = await getToggleState('toggleRelevance');
        let toxicState = await getToggleState('toggleToxicity');
        let reformState = await getToggleState("toggleReform");
        let modelID = chrome.storage.sync.get("selectedLlmId");
        console.log("Model_ID used= " + modelID);
   
        // Relevance
        if (relevanceState === 'checked') {
            let relevanceResponse;

            //TODO: CHECK IF CUSTOM PROMPTS WERE USED IF NOT USE DEFAULT FUNCTION createRelevancePrompt();
            //ELSE SET relevancePrompt WITH PROMPT FROM USER

            let relevancePrompt = await createRelevancePrompt();
            console.log("Relevance Prompt: " + relevancePrompt);
            if (modelID == googleGemma2b) { relevanceResponse = await getGemmaResponse(relevancePrompt); }
            else if (modelID == stabilityAi2b) { relevanceResponse = await getStableResponse(relevancePrompt); }
            else { relevanceResponse = await getDefaultLlmResponse(relevancePrompt); }
            // Function to get the response for each prompt
            const getResponse = async (additionalPrompt) => {
                let completePrompt = basePrompt + additionalPrompt;
                console.log("Prompt being processed: " + completePrompt);
                const response = await fetch(url + "generate-prompt", {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        prompt: completePrompt,
                        num_tokens: 500
                    })
                });
                const responseData = await response.json();
                return responseData.result.split(additionalPrompt).pop().trim();
            };
            promptsResponsesArray.push("Relevance: " + relevanceResponse);
        }
        // Toxicity
        if (toxicState === 'checked') {
            let toxicResponse;

            //TODO: CHECK IF CUSTOM PROMPTS WERE USED IF NOT USE DEFAULT FUNCTION createToxicityPrompt();
            //ELSE SET toxicPrompt WITH PROMPT FROM USER

            let toxicPrompt = await createToxicityPrompt();
            console.log("Toxic Prompt:" + toxicPrompt);
            if (modelID == googleGemma2b) { toxicResponse = await getGemmaResponse(toxicPrompt); } 
            else if (modelID == stabilityAi2b) { toxicResponse = await getStableResponse(toxicPrompt); }
            else { toxicResponse = await getDefaultLlmResponse(toxicPrompt); }
            promptsResponsesArray.push("Toxicity: " + toxicResponse);
        }
        // Reformulation
        if (reformState === 'checked') {
            let reformResponse;

            //TODO: CHECK IF CUSTOM PROMPTS WERE USED IF NOT USE DEFAULT FUNCTION createReformPrompt();
            //ELSE SET reformPrompt WITH PROMPT FROM USER

            let reformPrompt = await createReformPrompt();
            console.log("reform Prompt:" + reformPrompt);
            if (modelID == googleGemma2b) { reformResponse = await getGemmaResponse(reformPrompt); } 
            else if (modelID == stabilityAi2b) { reformResponse = await getStableResponse(reformPrompt); }
            else { reformResponse = await getDefaultLlmResponse(reformPrompt); }
            promptsResponsesArray.push("Reformulation: " + reformResponse);
        }
        // Check if no prompts were toggled and add a default reply
        if (promptsResponsesArray.length === 0) {
            promptsResponsesArray.push("Please toggle a prompt setting.");
        }

        // End timer
        let endTime = performance.now();
        let timeTaken = endTime - startTime;
        promptsResponsesArray.push(`Time taken: ${timeTaken.toFixed(2)} ms`);
    } else {
        console.log("No comment in text area");
        promptsResponsesArray.push("Please write a comment in the text area.");
    }
    return promptsResponsesArray;
}


// ----------  PROMPTS GENERATION ----------

//Returns the toxicity prompt in full
async function generateBasePrompt() {
    var basePrompt = "You are a helper bot that is assisting a programmer writing a reply to a pull request.";
    let comments = await getAllPullRequestComments();
    //console.log("Comments before if:" + comments);
    if (comments) {
        basePrompt += " Here are the previous comments made on a Pull request: ";
        comments.forEach(comment => {
            basePrompt += comment;
        });
    }
    let codeState = await getToggleState('toggleCode');
    if (codeState === 'checked') {
        basePrompt += "Here are the file names and code affected by this pull request: \n";
        let fileContents = await getAllFileContent();

        // Add the filename and patch text to the prompt
        if (fileContents.length > 0) {
            fileContents.forEach(fileContent => {
                basePrompt += fileContent + "\n";
            });
        } else {
            basePrompt += "No file changes are available for this pull request.\n";
        }
    }
    return basePrompt;
}


async function createToxicityPrompt() {
    let basePrompt = await generateBasePrompt();
    console.log("Toxic Base Prompt:" + basePrompt);
    let pendingComment = getCurrentComment();
    basePrompt += "Here is the pending reply: " + pendingComment;
    console.log("Toxic Base + pending Prompt:" + basePrompt);

    //Toxicity Prompt
    basePrompt += "Now as the helper bot, can you tell If the pending reply toxic? Your answer must be 2 sentences maximum and direct."
    console.log("Final Toxic prompt: " + basePrompt);
    return basePrompt;
}

//Returns the toxicity prompt in full
async function createRelevancePrompt() {
    let basePrompt = await generateBasePrompt();
    let pendingComment = getCurrentComment();
    basePrompt += "Here is the pending reply: " + pendingComment;

    //Relevancy Prompt
    basePrompt += "Now as the helper bot, can you tell If the pending reply relevant? Your answer must be 2 sentences maximum and direct."
    return basePrompt;
}
async function createReformPrompt() {
    let basePrompt = await generateBasePrompt();
    let pendingComment = getCurrentComment();
    basePrompt += "Here is the pending reply: " + pendingComment;

    //Reform Prompt
    basePrompt += "Now as the helper bot,Reformulate the pending reply in a professional way. Your answer must be 2 sentences maximum and direct."
    return basePrompt;
}

// ----------  GET LLM RESPONSE + FORMATTING ---------- 

//Function Used To call Gemma
async function getGemmaResponse(prompt) {
    const response = await fetch(url + "generate-response-Gemma", {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            prompt: prompt,
            num_tokens: 600
        })
    });
    const responseData = await response.json();
    //GEMMA always sends the prompt + Reply
    return responseData.result.split(prompt).pop().trim();
}

//Function Used To call stabilityai
async function getStableResponse(prompt) {
    const response = await fetch(url + "generate-response-stable", {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            prompt: prompt,
            num_tokens: 600
        })
    });
    const responseData = await response.json();
    console.log("responseData:" + responseData.result);
    return responseData.result.split(prompt).pop().trim();
}

async function getDefaultLlmResponse(prompt) {
    const response = await fetch(url + "generate-default-response", {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            prompt: prompt,
            num_tokens: 600
        })
    });
    const responseData = await response.json();
    return responseData.result;
}


// ----------  API FUNCTIONS ---------- 

// URL setter
function setURL(input) {
    url = input
}
// Check the API connexion
async function checkConnexion() {
    const response = await fetch(url + "connexion");
    return response.json();
}

// PromptID setter
async function setPromptID(id) {
    promptID = id;
}

// PromptID getter
async function getPromptID() {
    if (promptID == null) {
        await checkConnexion().then(response => {
            setPromptID(response.id);
            return response.id;
        }).catch((error) => {
            console.log(error);
        });
    }
    return promptID;
}

// Send POST request to API with prompt
async function postPrompt(data) {
    const response = await fetch(url + "generate", {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    });
    return response.json();
}
