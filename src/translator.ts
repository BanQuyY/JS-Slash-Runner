const stvServer = "comic.sangtacvietcdn.xyz/tsm.php?cdn=";
const chineseRegex = /[\u3400-\u9FBF]/;
const oldSend = XMLHttpRequest.prototype.send;

/**
 * Defines a target for translation, which can be a text node or an element's attribute.
 */
interface TranslationTarget {
    getText(): string | null;
    setText(text: string): void;
}

// List of attributes that are safe to translate.
const translatableAttributes = ['title', 'placeholder', 'alt', 'value'];

/**
 * Recursively traverses a DOM node, collecting all translatable content
 * (text nodes and specific attributes) into an array of targets.
 * @param node The DOM node to traverse.
 * @param targets An array to store the found TranslationTargets.
 */
function collectTranslationTargets(node: Node, targets: TranslationTarget[]) {
    // 1. Skip non-element and non-text nodes
    if (node.nodeType !== 1 && node.nodeType !== 3) {
        return;
    }

    // 2. Handle Text Nodes
    if (node.nodeType === 3) {
        if (node.textContent && chineseRegex.test(node.textContent)) {
            targets.push({
                getText: () => node.textContent,
                setText: (text: string) => { node.textContent = text; },
            });
        }
        return;
    }

    // 3. Handle Element Nodes
    const element = node as Element;
    const tagName = element.tagName;

    // Skip script/style tags completely
    if (tagName === 'SCRIPT' || tagName === 'STYLE') {
        return;
    }

    // Check specified attributes for translatable text
    for (const attrName of translatableAttributes) {
        if (element.hasAttribute(attrName)) {
            const value = element.getAttribute(attrName);
            if (value && chineseRegex.test(value)) {
                targets.push({
                    getText: () => element.getAttribute(attrName),
                    setText: (text: string) => element.setAttribute(attrName, text),
                });
            }
        }
    }

    // 4. Recurse into child nodes
    for (const child of Array.from(node.childNodes)) {
        collectTranslationTargets(child, targets);
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
 * Finds all Chinese text within a live iframe's body, translates it,
 * and replaces the content in-place.
 * @param iframe The live HTMLIFrameElement to translate.
 */
/**
 * Translates a single DOM node and its children.
 * @param node The DOM node to translate.
 */
async function translateNode(node: Node): Promise<void> {
    // 1. Collect all translatable targets from the node and its descendants
    const targets: TranslationTarget[] = [];
    collectTranslationTargets(node, targets);

    if (targets.length === 0) {
        return; // No translation needed for this node
    }

    // 2. Batch translate the text from all targets
    const originalTexts = targets.map(target => target.getText() || '');
    const joinedText = originalTexts.join("=|==|=");
    const translatedTexts = await translateBatch(joinedText);

    // 3. Replace original content with translated text
    if (originalTexts.length === translatedTexts.length) {
        targets.forEach((target, index) => {
            target.setText(translatedTexts[index]);
        });
    } else {
        console.error("Translator: Mismatch between original and translated text counts.");
    }
}

// Use a WeakSet to keep track of iframes that are already being observed
const observedIframes = new WeakSet<HTMLIFrameElement>();

/**
 * Finds all Chinese text within a live iframe's body, translates it,
 * and replaces the content in-place. It also sets up a MutationObserver
 * to handle dynamically loaded content.
 * @param iframe The live HTMLIFrameElement to translate.
 */
export async function translateIframeContent(iframe: HTMLIFrameElement): Promise<void> {
    try {
        // Ensure we only attach one observer per iframe to prevent duplicates
        if (observedIframes.has(iframe)) {
            return;
        }

        const body = iframe.contentWindow?.document.body;
        if (!body) {
            console.error("Translator: Iframe body not found.");
            return;
        }

        // 1. Perform an initial translation of the entire document body
        await translateNode(body);

        // 2. Set up an observer to handle dynamically added/changed content
        const observer = new MutationObserver(async (mutations) => {
            // Disconnect the observer temporarily to prevent infinite loops
            // from the translations we are about to make.
            observer.disconnect();

            const nodesToTranslate = new Set<Node>();
            for (const mutation of mutations) {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach(node => {
                        if (node.nodeType === 1 || node.nodeType === 3) {
                            nodesToTranslate.add(node);
                        }
                    });
                } else if (mutation.type === 'attributes') {
                    nodesToTranslate.add(mutation.target);
                }
            }

            if (nodesToTranslate.size > 0) {
                const translationPromises = Array.from(nodesToTranslate).map(n => translateNode(n));
                try {
                    await Promise.all(translationPromises);
                } catch (err) {
                    console.error("Translator: Failed to translate dynamic content.", err);
                }
            }

            // 4. Reconnect the observer to watch for future changes
            observer.observe(body, {
                childList: true,
                subtree: true,
                attributes: true,
                attributeFilter: translatableAttributes,
            });
        });

        // 3. Start observing the iframe body for changes
        observer.observe(body, {
            childList: true,    // For added/removed nodes
            subtree: true,      // To include all descendants
            attributes: true,   // For attribute changes
            attributeFilter: translatableAttributes, // Only watch attributes we can translate
        });

        // Mark this iframe as observed so we don't attach another observer
        observedIframes.add(iframe);

    } catch (error) {
        console.error("Translator: Failed to translate iframe content.", error);
    }
}
