const ANNOTATION_CLASS = 'detected-timestamp-annotation';
const PROCESSED_CLASS = 'timestamp-processed';
const TIMESTAMP_RANGE_START = '2002-01-01';
const TIMESTAMP_RANGE_END = '2050-12-31';

chrome.storage.sync.get(['savedUrls', 'timezone', 'timestampUnit'], function(result) {
    let timezone = result.timezone === 'GMT' ? 'GMT' : 'LOCAL';
    let timestampUnit = result.timestampUnit === 'seconds' ? 'seconds' : 'milliseconds';
    let shouldRun = true;

    // Check whitelist
    if (result.savedUrls) {
        const masks = result.savedUrls.split('\n').map(url => url.trim()).filter(Boolean);
        const currentUrl = window.location.href;
        shouldRun = urlMatchesWhitelist(currentUrl, masks);

        if (!shouldRun) {
            console.log('Page not whitelisted, extension inactive.');
            return;
        }
        console.log('Saved URLs:', masks);
    } else {
        console.log('No URLs saved in storage.');
    }

    if (shouldRun) {
        detectTimestampsInBody(timezone, timestampUnit);

        let count = 0;
        const intervalId = setInterval(() => {
            count++;
            detectTimestampsInBody(timezone, timestampUnit);
            if (count >= 1) {
                clearInterval(intervalId);
            }
        }, 3000);
    }
});

function detectTimestampsInBody(timezone, timestampUnit, doc = document) {
    removeTimestampAnnotations();

    let min, max, regex;
    if (timestampUnit === 'seconds') {
        min = Math.floor(new Date(TIMESTAMP_RANGE_START).getTime() / 1000);
        max = Math.floor(new Date(TIMESTAMP_RANGE_END).getTime() / 1000);
        regex = /(?<!\d)(\d{10})(?!\d)/g;
    } else {
        min = new Date(TIMESTAMP_RANGE_START).getTime();
        max = new Date(TIMESTAMP_RANGE_END).getTime();
        regex = /(?<!\d)(\d{13})(?!\d)/g;
    }

    const walker = doc.createTreeWalker(
        doc.body,
        NodeFilter.SHOW_TEXT,
        {
            acceptNode: function(node) {
                if (node.nodeValue.trim().length === 0) {
                    return NodeFilter.FILTER_REJECT;
                }
                return NodeFilter.FILTER_ACCEPT;
            }
        },
        false
    );

    // Collect all text nodes first
    let textNodes = [];
    let node;
    while ((node = walker.nextNode())) {
        textNodes.push(node);
    }

    // Now process each text node
    for (const node of textNodes) {
        let originalText = node.nodeValue;
        let matchArray;
        regex.lastIndex = 0; // Reset regex state
        const matches = [];
        
        // Collect all valid matches first
        while ((matchArray = regex.exec(originalText)) !== null) {
            const match = matchArray[0];
            const matchStart = matchArray.index;
            const matchEnd = matchStart + match.length;
            const n = Number(match);
            let date;
            let valid = false;
            
            if (timestampUnit === 'seconds') {
                if (n >= min && n <= max) {
                    date = new Date(n * 1000);
                    valid = true;
                }
            } else {
                if (n >= min && n <= max) {
                    date = new Date(n);
                    valid = true;
                }
            }
            
            if (valid) {
                let formatted = getFormattedDate(date, timezone);
                const now = Date.now();
                let tsValue = timestampUnit === 'seconds' ? n * 1000 : n;
                const color = tsValue >= now ? '#3ead6b' : '#d5ad75';
                
                matches.push({
                    start: matchStart,
                    end: matchEnd,
                    formatted: formatted,
                    color: color
                });
            }
        }
        
        // If we found any valid timestamps, create annotations
        if (matches.length > 0) {
            // Process matches in reverse order to maintain correct positions
            matches.reverse();
            
            for (const match of matches) {
                // Split the text node at the end of the timestamp
                const afterNode = node.splitText(match.end);
                const timestampNode = node.splitText(match.start);
                
                // Create the annotation span using innerHTML
                const annotationSpan = document.createElement('span');
                annotationSpan.className = ANNOTATION_CLASS;
                annotationSpan.innerHTML = 
                ` <span style="font-size: smaller; color: ${match.color};">[<span style="font-family: monospace;">${match.formatted}</span>]</span>`;
                
                // Insert the annotation after the timestamp
                timestampNode.parentNode.insertBefore(annotationSpan, afterNode);
                
                // Mark the timestamp node as processed
                if (timestampNode.parentNode.nodeType === Node.ELEMENT_NODE) {
                    timestampNode.parentNode.classList.add(PROCESSED_CLASS);
                }
            }
        }
    }
}

function getFormattedDate(date, timezone) {
    const pad = v => v.toString().padStart(2, '0');
    if (timezone === 'GMT') {
        return pad(date.getUTCDate()) + '-' +
            pad(date.getUTCMonth() + 1) + '-' +
            date.getUTCFullYear() + ' ' +
            pad(date.getUTCHours()) + ':' +
            pad(date.getUTCMinutes()) + ':' +
            pad(date.getUTCSeconds());
    } else {
        return pad(date.getDate()) + '-' +
            pad(date.getMonth() + 1) + '-' +
            date.getFullYear() + ' ' +
            pad(date.getHours()) + ':' +
            pad(date.getMinutes()) + ':' +
            pad(date.getSeconds());
    }
}
function removeTimestampAnnotations() {
    document.querySelectorAll(`.${ANNOTATION_CLASS}`).forEach(annotation => {
        annotation.remove();
    });
    
    document.querySelectorAll(`.${PROCESSED_CLASS}`).forEach(element => {
        element.classList.remove(PROCESSED_CLASS);
    });
}

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === "detectTimestamps") {
        chrome.storage.sync.get(['savedUrls', 'timezone', 'timestampUnit'], function(result) {
            let timezone = result.timezone === 'GMT' ? 'GMT' : 'LOCAL';
            let timestampUnit = result.timestampUnit === 'seconds' ? 'seconds' : 'milliseconds';
            let shouldRun = true;

            // Only check whitelist if not forced
            if (!request.force && result.savedUrls) {
                const masks = result.savedUrls.split('\n').map(url => url.trim()).filter(Boolean);
                const currentUrl = window.location.href;
                shouldRun = urlMatchesWhitelist(currentUrl, masks);
                if (!shouldRun) {
                    console.log('Page not whitelisted, extension inactive.');
                    return;
                }
            }

            // Run detection
            detectTimestampsInBody(timezone, timestampUnit);
        });
    }
});

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === "detectTimestamps") {
        // ...existing code...
    }
    if (request.action === "cleanTimestamps") {
        removeTimestampAnnotations();
    }
});

function urlMatchesWhitelist(url, masks) {
    // If no masks, allow all URLs
    if (!masks || masks.length === 0) {
        return true;
    }
    return masks.some(mask => {
        let regexStr = '^' + mask.trim().replace(/[-\/\\^$+?.()|[\]{}]/g, '\\$&').replace(/\*/g, '.*');
        // Make trailing slash optional
        if (regexStr.endsWith('\\/')) {
            regexStr = regexStr.slice(0, -2) + '(\\/)?';
        } else {
            regexStr += '(\\/)?';
        }
        regexStr += '$';
        const regex = new RegExp(regexStr);
        return regex.test(url);
    });
}

window.detectTimestampsInBody = detectTimestampsInBody;
window.removeTimestampAnnotations = removeTimestampAnnotations;