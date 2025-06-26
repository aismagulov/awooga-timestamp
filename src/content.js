// Access and modify the content of the current page

chrome.storage.sync.get(['savedUrls', 'timezone'], function(result) {
    let timezone = result.timezone === 'GMT' ? 'GMT' : 'LOCAL';

    if (result.savedUrls) {
        // result.savedUrls is a comma-separated string
        const urls = result.savedUrls.split(',').map(url => url.trim());
        console.log('Saved URLs:', urls);
        // You can now use the URLs as needed
    } else {
        console.log('No URLs saved in storage.');
    }
    detectTimestampsInBody(timezone);
    replaceParagraphText();

    let count = 0;
    const intervalId = setInterval(() => {
        count++;
        detectTimestampsInBody(timezone);
        if (count >= 3) {
            clearInterval(intervalId);
        }
    }, 5000);
});

function detectTimestampsInBody(timezone) {
    const min = new Date('2010-01-01').getTime();
    const max = new Date('2050-12-31').getTime();
    const regex = /\b\d{13}\b/g;

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

    let node;
    while ((node = walker.nextNode())) {
        let replaced = false;
        node.nodeValue = node.nodeValue.replace(regex, function(match) {
            // If the timestamp is already followed by our annotation, skip
            const afterMatch = node.nodeValue.slice(
                node.nodeValue.indexOf(match) + match.length,
                node.nodeValue.indexOf(match) + match.length + 40
            );
            const annotationPattern = /\[\d{2}-\d{2}-\d{4} \d{2}:\d{2}:\d{2}\]/;
            if (annotationPattern.test(afterMatch)) {
                return match;
            }
            const n = Number(match);
            if (n >= min && n <= max) {
                replaced = true;
                const date = new Date(n);
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
                return `${match}[[[${formatted}]]]`;
            }
            return match;
        });

       if (replaced) {
        const span = document.createElement('span');
        span.className = 'timestamp-processed';
        // Store the original text as a data attribute
        span.dataset.originalText = node.nodeValue;
        span.innerHTML = node.nodeValue.replace(
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
        chrome.storage.sync.get(['timezone'], function(result) {
            let timezone = result.timezone === 'GMT' ? 'GMT' : 'LOCAL';
            removeTimestampAnnotations();
            detectTimestampsInBody(timezone);
            console.log("Selected timezone:", timezone);
        });
    }
});