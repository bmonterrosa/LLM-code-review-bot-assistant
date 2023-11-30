let observer = null;
// Watch changes in the DOM
// Runs when something happens on the page
function observeDOM(){
    if(observer){
        observer.disconnect();
    }
    observer = new MutationObserver(mutations => {
        mutations.forEach(mutation =>{
            if(mutation.type === "childList" && mutation.addedNodes.length){
                checkIcon();
                //attachTextAreaEvent();
                attachCopyEvent();
            }
        });
    });
    
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
}

//Icon functions
//
//

//Check if icon exists
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

//Add Icon over github comment box
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

var llm_response = "";
function save_llm_response(input){
    llm_response = input;
}

function get_llm_response(){
    return llm_response;
}

async function getResponse() {
    return new Promise((resolve, reject) => {
        try {
            chrome.storage.local.get('llm_response', function(result) {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                } else {
                    resolve(result['llm_response']);
                }
            });
        } catch (error) {}
    });
}

//Attach onclick event on LLM Icon
function attachIconEvent(icon){
    icon.onclick = async function(event) {
        chrome.runtime.sendMessage({
            from: 'popup',
            subject: 'llm_response',
            response: "No response to display"
        });
        event.stopPropagation();
        icon.onmouseover = function() {
            this.style.transform = "translateY(-10%) scale(1.1)";
        };
        icon.onmouseout = function() {
            this.style.transform = "translateY(-10%) scale(1)";
        };
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

            //Send request to LLM
            await createPrompt().then(async data =>{
                await postPrompt(data).then(response => {
                    clearInterval(intervalId);

                    var res = response.result.toString();
                    var splitText = res.split('INST]');
                    //to remove
                    console.log(res);

                    save_llm_response(splitText[splitText.length-1]);

                    chrome.runtime.sendMessage({
                        from: 'popup',
                        subject: 'llm_response',
                        response: get_llm_response()
                    });

                    if(splitText[splitText.length-1].split('"')[1]){
                        resBox.value = splitText[splitText.length-1].split('"')[1];
                    }else{
                        resBox.value = get_llm_response();
                    }

                }).catch((error) => {
                    console.log(error);
                })
            })
         } else {
             popup.style.display = 'none';
         }
    };
}

//Update the visibility of the LLM Icon
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

//End of Icon
//
//

//watch changed when selecting differents tabs in github Single Application Page (SAP)
async function setupNav(){
    observeDOM();
    checkIcon();
    //attachTextAreaEvent();
    attachCopyEvent();
    updateIconVisibility();
}

window.addEventListener('popstate',setupNav);
window.addEventListener('hashchange',setupNav);
document.addEventListener('pjax:end',setupNav);

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupNav);
} else {
    setupNav();
}

//Function pour changer le contenu de l'extension
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

//Extension eventListener
document.addEventListener('DOMContentLoaded', async function() {
    updateTextArea();
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
        //
    }else{
        document.getElementById('full-llm-response').display = 'none';
    }

    openTab('View');

    //Add settings Toggle
    addReformToggle();
    addStatusToggle();
    updateIconVisibility();

    addCodeToggle()
    addRelevanceToggle()
    addToxicToggle()

    addEventSaveToken()
});

//Toggle switches functions
//
//

//Get the state enable/disable of the extension
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

//Add reformulate toggle
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

//add enable/disable toggle
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

//Add code toggle
async function addCodeToggle(){
    let lswitch = document.getElementById('codeSwitch');
    let currrentState = "";
    let toggle = document.createElement("input");

    try {
        currrentState = await getToggleState('toggleCode');
        if (!currrentState){
            chrome.runtime.sendMessage({
                from: 'popup',
                subject: 'toggleCode',
                toggleReform: toggle.checked
            });
            currrentState = await getToggleState('toggleCode');
        }
    } catch (error) {
        console.log("Error:",message);
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
        toggle.addEventListener('change', function() {
            chrome.runtime.sendMessage({
                from: 'popup',
                subject: 'toggleCode',
                toggleCode: toggle.checked
            });
        });
    }
}

//Add relevance toggle
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

//Add toxicity toggle
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

//End Toggle switches functions
//
//

//TextArea functions
//
//

//Add Textarea related to icon click
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

//Function pour copier le texte
function copyToClipboard() {
    const text = document.getElementById('llm-response').value;
    if(text){
        navigator.clipboard.writeText(text).then(() => {}).catch(error => {
            console.error('Can\'t copy text: ', error);
        });
    }
}

//Add event listener sur le bouton de copy
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

//Add event listener sur le texte area
function attachTextAreaEvent(){
     let textarea = document.getElementById("new_comment_field");
//     let resBox = document.getElementById("llm-response")
     if(textarea){
//         let area = document.getElementById("popup-llm");
//         //EventListeners for when user gets out of textarea
         textarea.addEventListener('change', function(event) {
             updateTextArea(event.target.value);
//             if(area){
//                 area.style.display = "none";
//             }
         });
         textarea.addEventListener('blur', function(event) {
             updateTextArea(event.target.value);

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

//Function to delay the get of the input
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

//todo change once LLM is integrated
//Save with given texte
async function updateTextArea(input){
    setCurrentComment(input);
}

var currentComment;
function setCurrentComment(input){
    currentComment = input;
}

function getCurrentComment() {
    return currentComment;
}
//End TextArea
//
//

//add event listener for all toggle state
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
    
    let area = document.getElementById("popup-llm");
    if(area){
        area.style.display = "none";
    }

    return true;
});

//Github API Functions
//
//

//PAT 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
var token = "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";
var headers = {
    'Authorization': `token ${token}`,
}

function setToken(customToken){
    token = customToken;
    headers= {
        'Authorization': `token ${token}`,
    }
}

function getToken(){
    return token;
}

function addEventSaveToken(){
    let saveButton = document.getElementById("TokenSave");
    saveButton.addEventListener("click", async ()=>{
        let tokenText = document.getElementById("github_Token");
        if(tokenText.value){
            setToken(tokenText.value);
            //console.log(getToken());
        }
    });
}

//Function to get pull request comments 
async function getPullRequestComments() {
    if(token){
        try {
            var urlInfo = getInfoFromURL();
            const url = `https://api.github.com/repos/${urlInfo.owner}/${urlInfo.repo}/issues/${urlInfo.pullNumber}/comments`;
            const response = await fetch(url, { headers: headers });
            if (!response.ok) {
                throw new Error(`Error: ${response.status}`);
            }
            const data = await response.json(); 
            const comments = data.map(async comment => {
                return comment.body;
            });
            return Promise.all(comments);
        } catch (error) {
            //console.error('Failed to fetch comments:', error);
        }
    }else{
        alert("No Personal access token detected!")
    }
}

//Test to get comments
// getPullRequestComments().then(comments => {
//         if (comments) {
//             console.log(comments);
//         }
//     });

//Function to extract info from URL to get all necessary data
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

//Function to get modified or added files url from Github
async function getPullRequestFiles() {
    if(token){
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
            //console.error('Failed to get PR:', error);
        }
    }else{
        alert("No Personal access token detected!")
    }
}

//Test to get files
// getPullRequestFiles().then(files => {
//         if (files) {
//             console.log(files);
//         }
//     });

//Function to seperate the files and get raw content
async function getFileRawContent(files) {
    try {
        const fileContentsPromises = files.map(async file => {
            const apiURL = file.contents_url;
            const response = await fetch(apiURL, { headers: headers });

            if (!response.ok) {
                throw new Error(`HTTP Error: ${response.status}`);
            }
            const content = await response.json();
            const contentName = content.name;
            const decodedContent = atob(content.content);
            
            return {contentName,decodedContent} ;
           
        });

        return Promise.all(fileContentsPromises);
    } catch (error) {
        //console.error('Failed to fetch file contents:', error);
    }
}

//Test to get raw content of files
// getPullRequestFiles().then(files => {
//         if (files) {
//             return getFileRawContent(files);
//         }
//     }).then(filesWithContent => {
//         if (filesWithContent) {
//             console.log(filesWithContent);
//         }
//     });

//Functions to get clean comments and file contents

//Function to get clean comments
function getAllPullRequestComments(){
    return getPullRequestComments().then(comments => {
        if (comments) {
            return comments;
        }
        return [];
    });
}

//Function to get clean file contents
function getAllFileContent(){
    return getPullRequestFiles().then(files => {
        if (files) {
            return getFileRawContent(files);
        }
        return [];
    }).then(filesWithContent => {
        if (filesWithContent) {
            return filesWithContent;
        }
        return [];
    });
}

//End Github API Functions
//
//


//Function to create the prompt
//
//

async function createPrompt(){
    var idPrompt = await getPromptID();
    var prompt = "You are a programmer reviewing and posting comments for a pull requests. \n";
    let relevanceState = await getToggleState('toggleRelevance');
    let toxicState = await getToggleState('toggleToxicity');
    if(relevanceState === 'checked'){
        //prompt += "Can you tell me if the comment is relevant? \n"
        prompt += "Determine if a comment is relevant to the code changes or discussion at hand. \n"

    }
    if(toxicState === 'checked'){
        //prompt += "Can you tell me if the comment is toxic? \n"
        prompt += "Identify if the comment is toxic, unprofessional, or inappropriate in any way. \n"
            
    }
    //Add comments to prompt
    let comments = await getAllPullRequestComments();
    if(comments){
        prompt += "Past comments made on a Pull request : \n";
        comments.forEach(comment => {
            prompt += '"'+comment + '"\n';
        });
    }

    let codeState = await getToggleState('toggleCode');
    //Add code element to prompt
    if(codeState === 'checked'){
        prompt += "Here are files that have been modified or added : \n";
        let fileContent = await getAllFileContent();
        if(fileContent){
            fileContent.forEach(content =>{
                var name = "File name : " + content.contentName + "\n";
                var textContent = "code : \n" + content.decodedContent + "\n";
                prompt += name + textContent;
            })
        }
        prompt += "End of code \n"
    }

    //Get current comment
    prompt += "Comment to be posted: \n";
    
    prompt += "\""+getCurrentComment() + "\". \n";
   
 
    let reformStat = await getToggleState("toggleReform");
    if(reformStat === 'checked'){
        prompt += "Reformulate the comment to make it constructive and respectful for a professional code review.\n";
    }else{
        prompt += "return my comment as it is.\n";
    }
    return {"id":idPrompt,"promt":prompt};
}

//End Prompt creation

//Connexion to API
//
//

var url = 'http://127.0.0.1:80/';
function setURL(input){
    url = input
} 

async function checkConnexion(){
    const response = await fetch(url+"connexion");
    return response.json();
}

var promptID = null;

async function setPromptID(id){
    promptID = id;
}

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

//End Connexion to API