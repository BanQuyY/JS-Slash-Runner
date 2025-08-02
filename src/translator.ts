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
// In-memory cache for the custom dictionary
let customDictionary: Map<string, string> = new Map();

/**
 * Parses the dictionary text from the textarea and updates the in-memory map.
 */
function parseCustomDictionary() {
    const textarea = document.getElementById('custom-dictionary') as HTMLTextAreaElement | null;
    if (!textarea) return;

    const text = textarea.value;
    const newDictionary = new Map<string, string>();
    const lines = text.split('\n');

    for (const line of lines) {
        const parts = line.split('=');
        if (parts.length === 2) {
            const original = parts[0].trim();
            const translated = parts[1].trim();
            if (original && translated) {
                newDictionary.set(original, translated);
            }
        }
    }
    customDictionary = newDictionary;
}

/**
 * Saves the custom dictionary to localStorage.
 */
function saveCustomDictionary() {
    const textarea = document.getElementById('custom-dictionary') as HTMLTextAreaElement | null;
    if (textarea) {
        localStorage.setItem('custom-dictionary', textarea.value);
    }
}

/**
 * Loads the custom dictionary from localStorage.
 */
function loadCustomDictionary() {
    const textarea = document.getElementById('custom-dictionary') as HTMLTextAreaElement | null;
    if (textarea) {
        textarea.value = localStorage.getItem('custom-dictionary') || '';
        parseCustomDictionary();
        // Add event listeners to update the dictionary on change and save it
        textarea.addEventListener('input', parseCustomDictionary);
        textarea.addEventListener('change', saveCustomDictionary);
    }
}

/**
 * Translates a batch of texts, prioritizing the custom dictionary.
 * @param texts The texts to translate.
 * @returns A promise that resolves with the translated texts.
 */
function translateBatch(texts: string[]): Promise<string[]> {
    const textsToTranslate: string[] = [];
    const results: (string | null)[] = Array(texts.length).fill(null);

    // First, use the custom dictionary
    texts.forEach((text, index) => {
        if (customDictionary.has(text)) {
            results[index] = customDictionary.get(text)!;
        } else {
            textsToTranslate.push(text);
        }
    });

    // If all texts were found in the dictionary, return immediately
    if (textsToTranslate.length === 0) {
        return Promise.resolve(results as string[]);
    }

    // Translate the remaining texts using the server
    const joinedText = textsToTranslate.join("=|==|=");
    return new Promise((resolve, reject) => {
        const ajax = new XMLHttpRequest();
        ajax.onreadystatechange = function () {
            if (this.readyState == 4) {
                if (this.status == 200) {
                    const translatedFromServer = this.responseText.split("=|==|=");
                    let serverIndex = 0;
                    for (let i = 0; i < results.length; i++) {
                        if (results[i] === null) {
                            results[i] = translatedFromServer[serverIndex++];
                        }
                    }
                    resolve(results as string[]);
                } else {
                    reject(new Error(`Translation server failed with status ${this.status}`));
                }
            }
        };
        ajax.open("POST", `//${stvServer}/`, true);
        ajax.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
        oldSend.apply(ajax, ["sajax=trans&content=" + encodeURIComponent(joinedText)]);
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
    const translatedTexts = await translateBatch(originalTexts);

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

        // 1. Load the custom dictionary first
        loadCustomDictionary();

        // 2. Perform an initial translation of the entire document body
        await translateNode(body);

        // 3. Set up an observer to handle dynamically added/changed content
        const observer = new MutationObserver(async (mutations) => {
            // Disconnect the observer temporarily to prevent infinite loops
            observer.disconnect();

            const nodesToTranslate = new Set<Node>();
            for (const mutation of mutations) {
                switch (mutation.type) {
                    case 'childList':
                        mutation.addedNodes.forEach(node => {
                            if (node.nodeType === 1 || node.nodeType === 3) {
                                nodesToTranslate.add(node);
                            }
                        });
                        break;
                    case 'attributes':
                        nodesToTranslate.add(mutation.target);
                        break;
                    case 'characterData':
                        // If a text node's data changes, re-translate its parent
                        // to handle the change in context.
                        if (mutation.target.parentElement) {
                            nodesToTranslate.add(mutation.target.parentElement);
                        }
                        break;
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
            startObserver(observer, body);
        });

        // 3. Start observing the iframe body for changes
        startObserver(observer, body);

        // Mark this iframe as observed so we don't attach another observer
        observedIframes.add(iframe);

    } catch (error) {
        console.error("Translator: Failed to translate iframe content.", error);
    }
}

/**
 * Starts the mutation observer with the correct options.
 * @param observer The MutationObserver instance.
 * @param target The node to observe.
 */
function startObserver(observer: MutationObserver, target: Node) {
    observer.observe(target, {
        childList: true,        // For added/removed nodes
        subtree: true,          // To include all descendants
        attributes: true,       // For attribute changes
        attributeFilter: translatableAttributes, // Only watch specified attributes
        characterData: true,    // Watch for changes to text node content
    });
}
