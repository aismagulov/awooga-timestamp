// Stub chrome.storage.sync for browser testing
if (typeof chrome === "undefined") {
    window.chrome = {};
}
if (!chrome.storage) {
    chrome.storage = {};
}
if (!chrome.storage.sync) {
    chrome.storage.sync = {};
}
chrome.storage.sync.get = function(keys, callback) {
    callback({
        savedUrls: '', // Allow all URLs
        timezone: 'LOCAL',
        timestampUnit: 'milliseconds'
    });
};
chrome.runtime = chrome.runtime || {};
chrome.runtime.onMessage = chrome.runtime.onMessage || {
    addListener: function() {}
};