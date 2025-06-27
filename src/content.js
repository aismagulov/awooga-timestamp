// Access and modify the content of the current page
chrome.storage.sync.get(['savedUrls', 'timezone', 'timestampUnit'], function(result) {
    let timezone = result.timezone === 'GMT' ? 'GMT' : 'LOCAL';
    let timestampUnit = result.timestampUnit === 'seconds' ? 'seconds' : 'milliseconds';
    let shouldRun = true;

    // Check whitelist
    if (result.savedUrls) {
        // Split by newlines instead of commas
        const masks = result.savedUrls.split('\n').map(url => url.trim()).filter(Boolean);
        const currentUrl = window.location.href;
        shouldRun = urlMatchesWhitelist(currentUrl, masks);
        // ...existing code...

        if (!shouldRun) {
            console.log('Page not whitelisted, extension inactive.');
            return;
        }
        console.log('Saved URLs:', masks);
    } else {
        console.log('No URLs saved in storage.');
    }

    // Only run if whitelisted
    if (shouldRun) {
        detectTimestampsInBody(timezone, timestampUnit);
        replaceParagraphText();

        let count = 0;
        const intervalId = setInterval(() => {
            count++;
            detectTimestampsInBody(timezone, timestampUnit);
            if (count >= 3) {
                clearInterval(intervalId);
            }
        }, 5000);
    }
});

function detectTimestampsInBody(timezone, timestampUnit) {
    let min, max, regex;
    if (timestampUnit === 'seconds') {
        min = Math.floor(new Date('2010-01-01').getTime() / 1000);
        max = Math.floor(new Date('2050-12-31').getTime() / 1000);
        regex = /(?<!\d)(\d{10})(?!\d)/g;
    } else {
        min = new Date('2010-01-01').getTime();
        max = new Date('2050-12-31').getTime();
        regex = /(?<!\d)(\d{13})(?!\d)/g;
    }

    // Helper to check if a node is inside a processed span
    function isInsideProcessedSpan(node) {
        while (node && node !== document.body) {
            if (
                node.nodeType === Node.ELEMENT_NODE &&
                node.classList &&
                node.classList.contains('timestamp-processed')
            ) {
                return true;
            }
            node = node.parentNode;
        }
        return false;
    }

    // Walk all text nodes in the body
    const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        {
            acceptNode: function(node) {
                // Skip any text node inside a processed span
                if (isInsideProcessedSpan(node)) {
                    return NodeFilter.FILTER_REJECT;
                }
                // Also skip annotation spans
                if (
                    node.parentNode &&
                    node.parentNode.nodeType === Node.ELEMENT_NODE &&
                    node.parentNode.matches('span.detected-timestamp-annotation')
                ) {
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
        // console.log('Walker node:', originalText);
        let replacedText = '';
        let lastIndex = 0;
        let hasReplacement = false;
        let matchArray;
        regex.lastIndex = 0; // Reset regex state
        while ((matchArray = regex.exec(originalText)) !== null) {
            const match = matchArray[0];
            const matchStart = matchArray.index;
            const matchEnd = matchStart + match.length;
            // Check if already annotated
            const afterMatch = originalText.slice(matchEnd, matchEnd + 40);
            const annotationPattern = /\[\d{2}-\d{2}-\d{4} \d{2}:\d{2}:\d{2}\]/;
            if (annotationPattern.test(afterMatch)) {
                replacedText += originalText.slice(lastIndex, matchEnd);
                lastIndex = matchEnd;
                continue;
            }
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
                '<span class="detected-timestamp-annotation" style="font-size:smaller; color:#4B2E05;"> [<span style="font-family:monospace;">$1</span>]</span>'
            );
            node.parentNode.replaceChild(span, node);
        }
    }
}

/**
 * Replaces the text content of all <p> elements on the page.
 * @param {string} newText - The text to set for all paragraphs.
 */
function replaceParagraphText() {
    const currentUrl = window.location.href;
    console.log("Current page URL:", currentUrl);

    document.querySelectorAll('p').forEach(p => {
      console.log(`paragrah detected`);
    });
}

function removeTimestampAnnotations() {
    document.querySelectorAll('span.timestamp-processed').forEach(span => {
        // Restore the original text from the data attribute, or fallback to textContent
        let original = span.dataset.originalText || span.textContent;
        // Remove any [[[...]]] markers from previous runs
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
            const masks = result.savedUrls ? result.savedUrls.split('\n').map(url => url.trim()).filter(Boolean) : [];
            const currentUrl = window.location.href;
            if (masks.length && !urlMatchesWhitelist(currentUrl, masks)) {
                console.log('Page not whitelisted, extension inactive.');
                return;
            }
            removeTimestampAnnotations();
            detectTimestampsInBody(timezone, timestampUnit);
            console.log("Selected timezone:", timezone, "Selected unit:", timestampUnit);
        });
    }
});

function urlMatchesWhitelist(url, masks) {
    // If no masks, allow all URLs
    if (!masks || masks.length === 0) {
        return true;
    }
    return masks.some(mask => {
        // Escape regex special chars except *
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