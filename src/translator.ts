const stvServer = "comic.sangtacvietcdn.xyz/tsm.php?cdn=";
const chineseRegex = /[\u3400-\u9FBF]/;
const oldSend = XMLHttpRequest.prototype.send;

/**
 * Recursively traverses a DOM node, collects all text nodes with Chinese characters,
 * and stores them in an array.
 * @param node The DOM node to traverse.
 * @param textNodes An array to store the found text nodes.
 */
function collectTextNodes(node: Node, textNodes: Node[]) {
    if (node.nodeType === 3) { // Text node
        if (node.textContent && chineseRegex.test(node.textContent)) {
            textNodes.push(node);
        }
        return;
    }

    if (node.nodeType === 1) { // Element node
        const tagName = (node as Element).tagName;
        if (tagName === 'SCRIPT' || tagName === 'STYLE') {
            return;
        }
        for (const child of Array.from(node.childNodes)) {
            collectTextNodes(child, textNodes);
        }
    }
}

/**
 * Translates a batch of texts.
 * @param texts The texts to translate, joined by a separator.
 * @returns A promise that resolves with the translated texts.
 */
function translateBatch(texts: string): Promise<string[]> {
    return new Promise((resolve, reject) => {
        const ajax = new XMLHttpRequest();
        ajax.onreadystatechange = function () {
            if (this.readyState == 4) {
                if (this.status == 200) {
                    resolve(this.responseText.split("=|==|="));
                } else {
                    reject(new Error(`Translation server failed with status ${this.status}`));
                }
            }
        };
        ajax.open("POST", `//${stvServer}/`, true);
        ajax.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
        oldSend.apply(ajax, ["sajax=trans&content=" + encodeURIComponent(texts)]);
    });
}

/**
 * Takes an HTML string, finds all Chinese text within it, translates it,
 * and returns the translated HTML string.
 * @param html The input HTML string.
 * @returns A promise that resolves with the translated HTML string.
 */
export async function translateHtmlContent(html: string): Promise<string> {
    try {
        // 1. Parse the HTML string into a DOM fragment
        const template = document.createElement('template');
        template.innerHTML = html.trim();
        const content = template.content;

        // 2. Collect all relevant text nodes
        const textNodes: Node[] = [];
        collectTextNodes(content, textNodes);

        if (textNodes.length === 0) {
            return html; // No translation needed
        }

        // 3. Batch translate the text
        const originalTexts = textNodes.map(node => node.textContent || '');
        const joinedText = originalTexts.join("=|==|=");
        const translatedTexts = await translateBatch(joinedText);

        // 4. Replace original text nodes with translated text
        if (originalTexts.length === translatedTexts.length) {
            textNodes.forEach((node, index) => {
                node.textContent = translatedTexts[index];
            });
        } else {
            console.error("Translator: Mismatch between original and translated text counts.");
            return html; // Return original HTML on error
        }

        // 5. Serialize the fragment back to an HTML string
        return template.innerHTML;
    } catch (error) {
        console.error("Translator: Failed to translate HTML content.", error);
        return html; // Return original HTML on error
    }
}
