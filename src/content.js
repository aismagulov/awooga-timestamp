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
    // Always clean up previous annotations first
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
        let replacedText = '';
        let lastIndex = 0;
        let hasReplacement = false;
        let matchArray;
        regex.lastIndex = 0; // Reset regex state
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
                hasReplacement = true;
                const pad = v => v.toString().padStart(2, '0');
                let formatted;
                if (timezone === 'GMT') {
                    formatted =
                        pad(date.getUTCDate()) + '-' +
                        pad(date.getUTCMonth() + 1) + '-' +
                        date.getUTCFullYear() + ' ' +
                        pad(date.getUTCHours()) + ':' +
                        pad(date.getUTCMinutes()) + ':' +
                        pad(date.getUTCSeconds());
                } else {
                    formatted =
                        pad(date.getDate()) + '-' +
                        pad(date.getMonth() + 1) + '-' +
                        date.getFullYear() + ' ' +
                        pad(date.getHours()) + ':' +
                        pad(date.getMinutes()) + ':' +
                        pad(date.getSeconds());
                }
                replacedText += originalText.slice(lastIndex, matchEnd) + `[[[${formatted}]]]`;
                lastIndex = matchEnd;
            } else {
                replacedText += originalText.slice(lastIndex, matchEnd);
                lastIndex = matchEnd;
            }
        }
        replacedText += originalText.slice(lastIndex);
        if (hasReplacement) {
            const span = document.createElement('span');
            span.className = 'timestamp-processed';
            span.dataset.originalText = replacedText;
            span.innerHTML = replacedText.replace(
                /\[\[\[(.*?)\]\]\]/g,
                function(_, formatted, offset, str) {
                    const before = str.slice(0, offset);
                    const numMatch = before.match(/(\d{10,13})$/);
                    let tsValue = 0;
                    if (numMatch) {
                        tsValue = Number(numMatch[1]);
                        if (timestampUnit === 'seconds' && tsValue < 1e12) {
                            tsValue *= 1000;
                        }
                    }
                    const now = Date.now();
                    const color = tsValue >= now ? '#3ead6b' : '#d5ad75';
                    return `<span class="detected-timestamp-annotation" style="font-size:smaller; color:${color};"> [<span style="font-family:monospace;">${formatted}</span>]</span>`;
                }
            );
            node.parentNode.replaceChild(span, node);
        }
    }
}

function removeTimestampAnnotations() {
    document.querySelectorAll('span.timestamp-processed').forEach(span => {
        // Restore the original text from the data attribute, or fallback to textContent
        let original = span.dataset.originalText || span.textContent;
        original = original.replace(/\[\[\[.*?\]\]\]/g, '');
        const replacement = document.createTextNode(original);
        span.replaceWith(replacement);
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