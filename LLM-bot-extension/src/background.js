function checkCurrentTabUrl() {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        if (tabs && tabs[0] && tabs[0].url) {
            const currentURL = tabs[0].url;

            if (currentURL.includes("pull")) {
                chrome.tabs.sendMessage(tabs[0].id, { action: "githubPage" });
            }
        }
    });
}
try {
    checkCurrentTabUrl();
} catch (error) {
    console.log(error);
}

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.from === 'popup' && request.subject === 'toggleState') {
        chrome.tabs.query({active: true, currentWindow: true}, async function(tabs) {
            if (chrome.runtime.lastError) {
                console.log("Error: ", chrome.runtime.lastError.message);
            }else if (tabs.length > 0) {
                chrome.tabs.sendMessage(tabs[0].id, {toggleState: request.toggleState});
                chrome.storage.sync.set({ 'toggleState': request.toggleState? "checked" : "not_checked"});
                try {
                    await chrome.storage.sync.get(['toggleState'], function(result) {
                        state = result.toggleState;
                    });
                } catch (error) {
                    console.log(error);
                }
            }
        });
    }
});

chrome.tabs.onActivated.addListener(function(activeInfo) {
    chrome.tabs.sendMessage(activeInfo.tabId, {action: "updateIconOnTabChange"});
});