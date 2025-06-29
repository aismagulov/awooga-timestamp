function testDetectTimestampsInBodyOnTestHtml(filePath, expectedCount) {
    return new Promise((resolve, reject) => {
        // Create a hidden iframe to load the test HTML
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        iframe.src = filePath;
        document.body.appendChild(iframe);

        iframe.onload = function() {
            try {
                // Log the initial HTML
                // console.log('Loaded iframe HTML:', iframe.contentDocument.body.innerHTML);

                // Run the function (use default args, e.g., 'LOCAL', 'milliseconds')
                window.detectTimestampsInBody('LOCAL', 'milliseconds', iframe.contentDocument);

                // Count the number of annotation spans
                const count = iframe.contentDocument.querySelectorAll('.detected-timestamp-annotation').length;
                console.log('Annotation count:', count);

                // Assert that there are expectedCount annotations
                if (count === expectedCount) {
                    console.log(`Test passed: ${expectedCount} date-time annotations found.`);
                    resolve(true);
                } else {
                    console.error(`Test failed: Expected ${expectedCount} annotations, found ${count}.`);
                    reject(new Error(`Expected ${expectedCount} annotations, found ${count}.`));
                }
            } catch (e) {
                reject(e);
            } finally {
                // Clean up
                document.body.removeChild(iframe);
            }
        };
        iframe.onerror = function() {
            reject(new Error('Failed to load test HTML file.'));
            document.body.removeChild(iframe);
        };
    });
}