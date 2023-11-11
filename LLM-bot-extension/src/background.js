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
    setInterval(checkCurrentTabUrl, 5000);
} catch (error) {
    console.log(error);
}
