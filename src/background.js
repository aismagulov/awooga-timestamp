chrome.runtime.onInstalled.addListener(() => {
    console.log('Extension installed');
});

chrome.browserAction.onClicked.addListener((tab) => {
    chrome.tabs.create({ url: 'src/popup/popup.html' });
});