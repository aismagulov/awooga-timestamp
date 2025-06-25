// This file contains the background script for the Chrome extension. 
// It handles events that occur in the background, such as browser actions or web requests.

chrome.runtime.onInstalled.addListener(() => {
    console.log('Extension installed');
});

chrome.browserAction.onClicked.addListener((tab) => {
    chrome.tabs.create({ url: 'src/popup/popup.html' });
});

// Add any additional background event listeners or functions here.