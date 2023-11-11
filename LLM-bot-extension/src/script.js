let observer = null;
// Watch changes in the DOM
function observeDOM(){
    if(observer){
        observer.disconnect();
    }
    observer = new MutationObserver(mutations => {
        mutations.forEach(mutation =>{
            if(mutation.type === "childList" && mutation.addedNodes.length){
                checkIcon();
                attachTextAreaEvent();
                attachCopyEvent();
            }
        });
    });
    
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
}

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

const popupHTML = `
    <div id="popup-llm" style="display: none; position: absolute; z-index: 1001; margin-top: 5px; width: auto">
        <div style="display: flex; justify-content: space-between; align-items: center;">
            <p id="llm-response" style="margin:5px">No comments to reformulate</p>
            <button type="button" class="preview_button" id="copySuggestion">Copy</button>
        </div>  
    </div>
`;

function addIconOverCommentBox(){
    let textarea = document.getElementById("new_comment_field");
    if(textarea){
        try {
            textarea.parentElement.insertAdjacentHTML('beforeend', popupHTML);

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
        } catch (error) {
            console.log(error)
        }
    }
}

function attachIconEvent(icon){
    icon.onclick = function(event) {
        event.stopPropagation();
        console.log("Icon was clicked!");
        
        icon.onmouseover = function() {
            this.style.transform = "translateY(-10%) scale(1.1)";
        };
        icon.onmouseout = function() {
            this.style.transform = "translateY(-10%) scale(1)";
        };
        
        const popup = document.getElementById('popup-llm');
        if (popup.style.display === 'none') {
            popup.className = "js-previewable-comment-form write-selected Box CommentBox";    
            popup.style.display = 'block';
        } else {
            popup.style.display = 'none';
        }
    };
}

function setupNav(){
    observeDOM();
    checkIcon();
    attachTextAreaEvent();
    attachCopyEvent();
}

window.addEventListener('popstate',setupNav);
window.addEventListener('hashchange',setupNav);
document.addEventListener('pjax:end',setupNav);

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupNav);
} else {
    setupNav();
}

chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
    if (message.action === "githubPage") {
        if(document.body.contains(document.getElementById("new_comment_field"))){
            //console.log("in pull page");            
        }
    }
});

document.addEventListener('DOMContentLoaded', function() {
    updateTextArea();
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
});

function copyToClipboard() {
    const text = document.getElementById('llm-response').innerText;
    if(text){
        navigator.clipboard.writeText(text).then(() => {}).catch(err => {
            console.error('Can\'t copy text: ', err);
        });
    }
}

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

function attachTextAreaEvent(){
    let textarea = document.getElementById("new_comment_field");
    let resBox = document.getElementById("llm-response")
    if(textarea){
        textarea.addEventListener('input', function(event) {
            updateTextArea(event.target.value);
            if(event.target.value.length == 0){
                resBox.textContent = "No comment to reformulate";
            }
        });
    }
}

function updateTextArea(input){
    const responseBox = document.getElementById("llm-response");
    if(responseBox){
        responseBox.textContent = input;
    }
        
}

// document.addEventListener('DOMContentLoaded', function() {
//     /*Toggle Apply and Undo button*/
//     function toggleButton(buttonElement) {
//         if (buttonElement.innerText === 'Apply') {
//             buttonElement.innerText = 'Undo';
//         } else {
//             buttonElement.innerText = 'Apply';
//         }
//     }

//     document.querySelectorAll('.applyButton').forEach(function(button) {
//         button.addEventListener('click', function() {
//             toggleButton(button)
//             button.classList="undoButton"
//         });
//     });

//     document.querySelectorAll('.undoButton').forEach(function(button) {
//         button.addEventListener('click', function() {
//             toggleButton(button)
//             button.classList="applyButton"
//         });
//     });
// });

