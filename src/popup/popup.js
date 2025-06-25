// This file contains the JavaScript for the popup. It handles user interactions and communicates with the background script if necessary.

document.addEventListener('DOMContentLoaded', function() {
    const button = document.getElementById('myButton');
    if (button) {
        button.addEventListener('click', function() {
            // Handle button click event
            chrome.runtime.sendMessage({ action: 'buttonClicked' }, function(response) {
                console.log('Response from background:', response);
            });
        });
    }

    const saveUrlsButton = document.getElementById('saveUrlsButton');
    const urlTextarea = document.getElementById('urlTextarea');

    if (saveUrlsButton && urlTextarea) {
        // Load saved URLs on popup open
        chrome.storage.sync.get(['savedUrls'], function(result) {
            if (result.savedUrls) {
                urlTextarea.value = result.savedUrls;
            }
        });

        saveUrlsButton.addEventListener('click', function() {
            const urls = urlTextarea.value;
            chrome.storage.sync.set({ savedUrls: urls }, function() {
                alert('URLs saved!');
            });
        });
    }
});