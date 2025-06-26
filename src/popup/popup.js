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

    // Timezone toggle functionality
    const timezoneToggle = document.getElementById('timezoneToggle');
    const timezoneLabel = document.getElementById('timezoneLabel');
    function updateLabel(value) {
        timezoneLabel.textContent = value === 'GMT' ? 'GMT' : 'Local';
    }

    if (timezoneToggle && timezoneLabel) {
        // Load saved timezone preference, default to LOCAL
        chrome.storage.sync.get(['timezone'], function(result) {
            const value = result.timezone === 'GMT' ? 'GMT' : 'LOCAL';
            timezoneToggle.checked = value === 'GMT';
            updateLabel(value);
        });

        timezoneToggle.addEventListener('change', function() {
            const value = timezoneToggle.checked ? 'GMT' : 'LOCAL';
            chrome.storage.sync.set({ timezone: value });
            updateLabel(value);
        });
    }

    // Detect timestamps button functionality
    const detectBtn = document.getElementById('detectTimestampsBtn');
if (detectBtn) {
    detectBtn.addEventListener('click', function() {
        chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
            chrome.tabs.sendMessage(tabs[0].id, { action: "detectTimestamps" });
        });
    });
}

if (timezoneToggle && timezoneLabel) {
    // ...existing code...
    timezoneToggle.addEventListener('change', function() {
        const value = timezoneToggle.checked ? 'GMT' : 'LOCAL';
        chrome.storage.sync.set({ timezone: value }, function() {
            // After saving, trigger re-annotation
            chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
                chrome.tabs.sendMessage(tabs[0].id, { action: "detectTimestamps" });
            });
        });
        updateLabel(value);
    });
}
});