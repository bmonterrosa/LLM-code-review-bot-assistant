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

setInterval(checkCurrentTabUrl, 5000);

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.from === 'popup' && request.subject === 'toggleState') {
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            if (tabs.length > 0) {
                chrome.tabs.sendMessage(tabs[0].id, {toggleState: request.toggleState});
            }
        });
    }
});