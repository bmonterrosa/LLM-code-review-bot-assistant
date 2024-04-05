let observer = null;
var llmResponse = "";
var currentComment;
var url = 'http://127.0.0.1:80/';
var promptID = null;
var token = '';

// ---------- LISTENERS ----------

window.addEventListener('popstate',setupNav);
window.addEventListener('hashchange',setupNav);
document.addEventListener('pjax:end',setupNav);

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupNav);
} else {
    setupNav();
}

// Extension listener
document.addEventListener('DOMContentLoaded', async function() {
    //Check if on github
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        if (tabs && tabs[0] && tabs[0].url) {
            const currentURL = tabs[0].url;
            if (currentURL.includes("github.com")) {
                document.getElementById('content').style.display = 'block';
            } else {
                document.getElementById('message').style.display = 'block';
            }
        } else {
            console.error("No tabs were found.");
        }
    });

    //Change tabs in extension
    document.getElementById('viewTab').addEventListener('click', function () {
        openTab('View');
    });

    document.getElementById('settingsTab').addEventListener('click', function () {
        openTab('Settings');
    });

    var resp = await getResponse();
    document.getElementById('full-llm-response').height = 'auto';
    if(resp){
        document.getElementById('full-llm-response').display = 'block';
        document.getElementById('full-llm-response').value = resp;
    }else{
        document.getElementById('full-llm-response').display = 'none';
    }

    openTab('View');

    //Add settings Toggle
    addReformToggle();
    addStatusToggle();

    addReviewsToggle()
    addRelevanceToggle()
    addToxicToggle()

    addEventChangeLLM()
    addEventGithubSaveToken()
    addEventHuggingFaceSaveToken()
});

// Toggle state listener
chrome.runtime.onMessage.addListener(async function(request, sender, sendResponse) {
    let icon = document.getElementById('LLM_Icon');
    //Update toggle state
    if(icon&&(request.toggleState == true || request.toggleState == false)){
        icon.style.display = request.toggleState ? 'block' : 'none';
        let state = request.toggleState ? "checked" : "not_checked";
        try {
            await chrome.storage.sync.set({ 'toggleState': state });
            updateIconVisibility()

        } catch (error) {
            console.log("Error:",error);
        }
    }

    //Handle toggle reform comment state
    let copyButton = document.getElementById("copySuggestion");
    if(copyButton && request.toggleReform != null){
        if(request.toggleReform){
            copyButton.style.display = "flex";
        }else if(!request.toggleReform){
            copyButton.style.display = "none";
        }
    }
    
    //Update Icon when changing tabs 
    if(request.action === "updateIconOnTabChange"){
        updateIconVisibility();
        sendResponse({result: "UpdatedIcon"});
    }

    return true;
});




// ---------- GENERAL FUNCTIONS ----------

// Watch changes in the DOM
function observeDOM(){
    if(observer){
        observer.disconnect();
    }
    observer = new MutationObserver(mutations => {
        mutations.forEach(mutation =>{
            if(mutation.type === "childList" && mutation.addedNodes.length){
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

// Change extension content
function openTab(tabName) {
    var i, tabcontent, tablinks;
    tabcontent = document.getElementsByClassName("tabcontent");
    for (i = 0; i < tabcontent.length; i++) {
        tabcontent[i].style.display = "none";
    }
    tablinks = document.getElementsByClassName("tablinks");
    for (i = 0; i < tablinks.length; i++) {
        tablinks[i].classList.remove("active");
    }
    document.getElementById(tabName).style.display = "block";
    document.getElementById(tabName.toLowerCase() + 'Tab').classList.add("active");
}

// Watch changed when selecting differents tabs in github Single Application Page (SAP)
async function setupNav(){
    observeDOM();
    checkIcon();
    attachTextAreaEvent();
    attachCopyEvent();
    updateIconVisibility();
}




// ---------- ICONS FUNCTIONS ----------

// Check if icon exists
function checkIcon(){
    const newCommentField = document.getElementById("new_comment_field");
    let icon = document.getElementById("LLM_Icon");
    if(newCommentField && !icon){
        addIconOverCommentBox();
    }
    if(icon){
        attachIconEvent(icon);
    }
}

// Add Icon over github comment box
async function addIconOverCommentBox(){
    let textarea = document.getElementById("new_comment_field");
    if(textarea){
        try {
            //add a function to add the text area
            add_LLM_Reply_Area();
            //Creating the LLM icon
            let icon = document.createElement('img');
            icon.id = "LLM_Icon";
            icon.alt = "Icon";
            icon.src = chrome.runtime.getURL("icon/LLM-bot-NoBackground.png");
        
            icon.onmouseover = function() {
                this.style.transform = "translateY(-10%) scale(1.1)";
            };
            icon.onmouseout = function() {
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
function saveLLMResponse(input){
    llmResponse = input;
}

// LLMResponse getter
function getLLMResponse(){
    return llmResponse;
}

// Get the response from local storage
async function getResponse() {
    return new Promise((resolve, reject) => {
        try {
            chrome.storage.local.get('llmResponse', function(result) {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                } else {
                    resolve(result['llmResponse']);
                }
            });
        } catch (error) {}
    });
}

// Attach onclick event on LLM Icon
function attachIconEvent(icon){
    icon.onmouseover = function() {
        this.style.transform = "translateY(-10%) scale(1.1)";
    };
    icon.onmouseout = function() {
        this.style.transform = "translateY(-10%) scale(1)";
    };
    icon.onclick = async function(event) {
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
    if(icon){
        try {
            currrentState = await getToggleState('toggleState');
            if (currrentState === "checked") {
                icon.style.display = 'block'; 
            } else {
                icon.style.display = 'none';
                textarea.style.display = 'none';
            }
        } catch (error) {
            console.log("Error:",error);
        }
    }
}



// ---------- TOGGLES FUNCTIONS ----------

// Get the state enable/disable of the extension
async function getToggleState(key) {
    return new Promise((resolve, reject) => {
        try {
            chrome.storage.sync.get([key], function(result) {
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
async function addReformToggle(){
    let lswitch = document.getElementById('reformulationSwitch');
    let currrentState = "";
    let toggle = document.createElement("input");

    try {
        currrentState = await getToggleState('toggleReform');
        if (!currrentState){
            chrome.runtime.sendMessage({
                from: 'popup',
                subject: 'toggleReform',
                toggleReform: toggle.checked
            });
            currrentState = await getToggleState('toggleReform');
        }
    } catch (error) {
        console.log("Error:",message);
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
        toggle.addEventListener('change', function() {
            chrome.runtime.sendMessage({
                from: 'popup',
                subject: 'toggleReform',
                toggleReform: toggle.checked
            });
        });
    }
}

// Add enable/disable toggle
async function addStatusToggle(){
    let lswitch = document.getElementById('enableSwitch');
    let currrentState = "";
    let toggle = document.createElement("input");

    try {
        currrentState = await getToggleState('toggleState');
        if (!currrentState){
            chrome.runtime.sendMessage({
                from: 'popup',
                subject: 'toggleState',
                toggleReform: toggle.checked
            });
            currrentState = await getToggleState('toggleState');
        }
    } catch (error) {
        console.log("Error:",message);
    }

    toggle.type = "checkbox";
    toggle.id = "toggleExtension";
    
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
                subject: 'toggleState',
                toggleState: toggle.checked
            });
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
async function addRelevanceToggle(){
    let lswitch = document.getElementById('relevanceSwitch');
    let currrentState = "";
    let toggle = document.createElement("input");

    try {
        currrentState = await getToggleState('toggleRelevance');
        if (!currrentState){
            chrome.runtime.sendMessage({
                from: 'popup',
                subject: 'toggleRelevance',
                toggleReform: toggle.checked
            });
            currrentState = await getToggleState('toggleRelevance');
        }
    } catch (error) {
        console.log("Error:",message);
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
        toggle.addEventListener('change', function() {
            chrome.runtime.sendMessage({
                from: 'popup',
                subject: 'toggleRelevance',
                toggleRelevance: toggle.checked
            });
        });
    }
}

// Add toxicity toggle
async function addToxicToggle(){
    let lswitch = document.getElementById('toxicitySwitch');
    let currrentState = "";
    let toggle = document.createElement("input");

    try {
        currrentState = await getToggleState('toggleToxicity');
        if (!currrentState){
            chrome.runtime.sendMessage({
                from: 'popup',
                subject: 'toggleToxicity',
                toggleReform: toggle.checked
            });
            currrentState = await getToggleState('toggleToxicity');
        }
    } catch (error) {
        console.log("Error:",message);
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
        toggle.addEventListener('change', function() {
            chrome.runtime.sendMessage({
                from: 'popup',
                subject: 'toggleToxicity',
                toggleToxicity: toggle.checked
            });
        });
    }
}

// ---------- LLM CHANGE FUNCTIONS ----------

async function addEventChangeLLM(){
    document.getElementById("llm_change_button").addEventListener("click", async function(){
        var selectedValue = document.getElementById("llm_selected").value; 
        alert("Changing LLM please wait... look at console to see when llm is saved")
        try {
        // Make a GET request to FastAPI server
        const response = await fetch(url + `changeLLM/?data=${selectedValue}`);
        //const response = await fetch(`http://127.0.0.1/premierdem`)
        const data = await response.json()
        } catch (error) {
        console.error('Error:', error)
        }
    });
}


// ---------- TEXTAREA FUNCTIONS ----------

// Add Textarea related to icon click
async function add_LLM_Reply_Area(){
    let parentNode = document.getElementById("partial-new-comment-form-actions");
    if (!parentNode) {
        console.error("Div not found for textArea");
        return;
    }

    const divNode = document.createElement("div");
    divNode.id="popup-llm";
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
    if(copyButton && reformState != null){
        if(reformState === "checked"){
            copyButton.style.display = "flex";
        }else if(reformState === "not_checked"){
            copyButton.style.display = "none";
        }
    }
}

// Copy text
function copyToClipboard() {
    const text = document.getElementById('llm-response').value;
    if(text){
        navigator.clipboard.writeText(text).then(() => {}).catch(error => {
            console.error('Can\'t copy text: ', error);
        });
    }
}

// Add copy button event listener
function attachCopyEvent(){
    if(document.getElementById("copySuggestion")){
        document.addEventListener('click', function(event) {
            if (event.target.id === 'copySuggestion') {
                event.preventDefault();
                copyToClipboard();
            }
        });
    }
}

// Add text area event listener
function attachTextAreaEvent(){
     let textarea = document.getElementById("new_comment_field");
     if(textarea){
        //EventListeners for when user gets out of textarea
         textarea.addEventListener('change', function(event) {
             updateTextArea(event.target.value);
            // if(textarea){
            //     textarea.style.display = "none";
            // }
         });
         textarea.addEventListener('blur', function(event) {
             updateTextArea(event.target.value);
            //  if(textarea){
            //     textarea.style.display = "none";
            // }
         });

        //EventListeners for when user is done writing, get the text is delayed
         textarea.addEventListener('input', getTextOvertime(function(event) {
             updateTextArea(event.target.value); 
             if(event.target.value.length == 0){
                resBox.value = "Waiting on LLM to review comment";
            }
         }),1000);

       
     }
 }

// Delay the get of the input
function getTextOvertime(func,waitingFunc){
    let time;
    return function execute(...args){
        const overtime = function(){
            clearTimeout(time);
            func(...args);
        };
        clearTimeout(time);
        time = setTimeout(overtime,waitingFunc)
    }    
}

// Save with given texte
async function updateTextArea(input){
    setCurrentComment(input);
}

// Currentcomment setter
function setCurrentComment(input){
    currentComment = input;
}

// Currentcomment getter
function getCurrentComment() {
    return currentComment;
}

// ----------  HUGGING FACE API FUNCTIONS ---------- 

function setHuggingFaceToken(userToken) {
    // Save the token to chrome.storage
    chrome.storage.sync.set({ 'huggingFaceToken': userToken }, function() {
        console.log('Hugging Face Token is saved');
    });
    // Use the token immediately if needed
}


function addEventHuggingFaceSaveToken(){
    let saveButton = document.getElementById("hugging_face_token_save");
    saveButton.addEventListener("click", async ()=>{
        let tokenText = document.getElementById("hugging_face_token");
        if(tokenText.value){
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
    chrome.storage.sync.set({ 'githubToken': userToken }, function() {
        console.log('GitHub Token is saved');
    });
    // Update the local variable if needed for immediate use
    token = userToken;
}

// Token getter
function getToken(){
    return token;
}

// Add event listener to watch when token is saved
function addEventGithubSaveToken(){
    let saveButton = document.getElementById("github_token_save");
    saveButton.addEventListener("click", async ()=>{
        let tokenText = document.getElementById("github_token");
        if(tokenText.value){
            setGitHubToken(tokenText.value);
        }
    });
}

function loadGitHubToken() {
    return new Promise((resolve, reject) => {
        chrome.storage.sync.get('githubToken', function(result) {
            if(result.githubToken) {
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


// pour un review sans review.in_reply_to_id :
//  - code en revue : review.diff_hunk
//  - commentaire : review.body

// si review contient in_reply_to_id , c'est un commentaire

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
function getAllPullRequestComments(){
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



// ----------  PROMPT FUNCTION ---------- 

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

        if (relevanceState === 'checked') {
            // Get files changed for relevance check
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
            let relevanceResponse = await getResponse("Now as the helper bot, can you tell If the pending reply relevant? Keep your answer within 2 sentences.\n");
            promptsResponsesArray.push("Relevance: " + relevanceResponse);
        }
        if (toxicState === 'checked') {
            let toxicResponse = await getResponse("Now as the helper bot,is the pending reply toxic? Keep your answer within 2 sentences.\n");
            promptsResponsesArray.push("Toxicity: " + toxicResponse);
        }
        if (reformState === 'checked') {
            let reformResponse = await getResponse("Now as the helper bot,Reformulate the pending reply in a professional way within 2 sentences.\n");
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
    }else {
        console.log("No comment in text area");
        promptsResponsesArray.push("Please write a comment in the text area.");
    }
    return promptsResponsesArray;
}



// ----------  API FUNCTIONS ---------- 
// URL setter
function setURL(input){
    url = input
} 
// Check the API connexion
async function checkConnexion(){
    const response = await fetch(url+"connexion");
    return response.json();
}

// PromptID setter
async function setPromptID(id){
    promptID = id;
}

// PromptID getter
async function getPromptID(){
    if(promptID==null){
        await checkConnexion().then(response =>{
            setPromptID(response.id);
            return response.id;
        }).catch((error)=>{
            console.log(error);
        });
    }
    return promptID;
}

// Send POST request to API with prompt
async function postPrompt(data){
    const response = await fetch(url+"generate",{
        method: 'POST',
        headers: {
            'Content-Type':'application/json'
        },
        body:JSON.stringify(data)
    });
    return response.json();
}
