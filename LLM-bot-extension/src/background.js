function checkCurrentTabUrl() {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        if (tabs.length > 0 && tabs[0].url.includes("pull")) {
            sendMessageToTab(tabs[0].id, { action: "githubPage" });
        }
    });
}

try {
    checkCurrentTabUrl();
} catch (error) {
    console.log(error);
}

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.from === 'popup'){
        if(request.subject.includes('toggle')){
            chrome.tabs.query({active: true, currentWindow: true}, async function(tabs) {
                if(tabs.length>0){
                    let toggleValue =   request.subject === 'toggleReform'? request.toggleReform : 
                                        request.subject === 'toggleState'? request.toggleState : 
                                        request.subject === 'toggleCode'? request.toggleCode :
                                        request.subject === 'toggleRelevance'? request.toggleRelevance :
                                        request.subject === 'toggleToxicity'? request.toggleToxicity : null;
                    if(toggleValue != null){
                        chrome.tabs.sendMessage(tabs[0].id, {[request.subject]: toggleValue});
                        chrome.storage.sync.set({ [request.subject]: toggleValue? "checked" : "not_checked"});
                    }
                }
            });
        }
        if(request.subject === 'llm_response'){
            chrome.storage.local.set({ [request.subject]: request.response});
        }
    }
});

function sendMessageToTab(tabId, message) {
    chrome.tabs.sendMessage(tabId, message, function(response) {
        if (chrome.runtime.lastError) {
            // console.error(chrome.runtime.lastError.message);
        }
    });
}

chrome.tabs.onActivated.addListener(function(activeInfo) {
    chrome.tabs.get(activeInfo.tabId, function(tab) {
        if (tab.url && tab.url.includes('pull')) {
            sendMessageToTab(activeInfo.tabId, {action: "updateIconOnTabChange"});
        }
    });
});
