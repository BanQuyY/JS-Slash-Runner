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
let deletionRegexes: RegExp[] = [];

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
 * Parses the deletion regexes from the textarea and updates the in-memory array.
 */
function parseDeletionRegexes() {
    const textarea = document.getElementById('deletion-regexes') as HTMLTextAreaElement | null;
    if (!textarea) return;

    const text = textarea.value;
    const newRegexes: RegExp[] = [];
    const lines = text.split('\n');

    for (const line of lines) {
        const trimmedLine = line.trim();
        if (trimmedLine) {
            try {
                // Add 'g' flag for global replacement
                newRegexes.push(new RegExp(trimmedLine, 'g'));
            } catch (e) {
                console.error(`Translator: Invalid regex: "${trimmedLine}"`, e);
            }
        }
    }
    deletionRegexes = newRegexes;
}

/**
 * Saves the deletion regexes to localStorage.
 */
function saveDeletionRegexes() {
    const textarea = document.getElementById('deletion-regexes') as HTMLTextAreaElement | null;
    if (textarea) {
        localStorage.setItem('deletion-regexes', textarea.value);
    }
}

/**
 * Loads the custom dictionary and deletion regexes from localStorage
 * and sets up event listeners.
 * This should be called once when the UI is initialized.
 */
export function initializeTranslator() {
    // Initialize Custom Dictionary
    const dictionaryTextarea = document.getElementById('custom-dictionary') as HTMLTextAreaElement | null;
    if (dictionaryTextarea) {
        dictionaryTextarea.value = localStorage.getItem('custom-dictionary') || '';
        parseCustomDictionary();
        dictionaryTextarea.addEventListener('input', parseCustomDictionary);
        dictionaryTextarea.addEventListener('change', saveCustomDictionary);
    }

    // Initialize Deletion Regexes
    const regexTextarea = document.getElementById('deletion-regexes') as HTMLTextAreaElement | null;
    if (regexTextarea) {
        regexTextarea.value = localStorage.getItem('deletion-regexes') || '';
        parseDeletionRegexes();
        regexTextarea.addEventListener('input', parseDeletionRegexes);
        regexTextarea.addEventListener('change', saveDeletionRegexes);
    }
}

/**
 * Translates a batch of texts, prioritizing the custom dictionary.
 * This function implements a placeholder strategy to ensure custom dictionary
 * entries are respected within larger text blocks.
 * @param originalTexts The texts to translate.
 * @returns A promise that resolves with the translated texts.
 */
function translateBatch(originalTexts: string[]): Promise<string[]> {
    const textsForServer: string[] = [];
    const placeholderMaps: Map<string, string>[] = [];

    // Step 1: Pre-process texts. Replace dictionary words with placeholders.
    originalTexts.forEach(text => {
        let processedText = text;
        const currentPlaceholderMap = new Map<string, string>();
        let placeholderIndex = 0;

        customDictionary.forEach((translated, original) => {
            if (processedText.includes(original)) {
                const placeholder = `__D${placeholderIndex}__`;
                // Use a regex to replace all occurrences
                processedText = processedText.replace(new RegExp(original, 'g'), placeholder);
                currentPlaceholderMap.set(placeholder, translated);
                placeholderIndex++;
            }
        });

        textsForServer.push(processedText);
        placeholderMaps.push(currentPlaceholderMap);
    });

    // Step 2: Translate the processed texts with the server.
    const joinedText = textsForServer.join("=|==|=");

    // If there's nothing to translate (e.g., everything was in the dictionary),
    // just do the placeholder replacement and return.
    if (!chineseRegex.test(joinedText)) {
        const finalResults = textsForServer.map((text, i) => {
            let result = text;
            placeholderMaps[i].forEach((translated, placeholder) => {
                result = result.replace(new RegExp(placeholder, 'g'), translated);
            });
            return result;
        });
        return Promise.resolve(finalResults);
    }

    return new Promise((resolve, reject) => {
        const ajax = new XMLHttpRequest();
        ajax.onreadystatechange = function () {
            if (this.readyState == 4) {
                if (this.status == 200) {
                    const translatedFromServer = this.responseText.split("=|==|=");
                    
                    // Step 3: Post-process. Replace placeholders back.
                    const finalResults = translatedFromServer.map((translatedText, i) => {
                        let result = translatedText;
                        const currentPlaceholderMap = placeholderMaps[i];
                        currentPlaceholderMap.forEach((translated, placeholder) => {
                            result = result.replace(new RegExp(placeholder, 'g'), translated);
                        });
                        return result;
                    });
                    resolve(finalResults);
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
 * Recursively traverses a DOM node and applies deletion regexes to all text nodes.
 * @param node The DOM node to clean.
 */
function cleanupNode(node: Node) {
    // Recurse for element nodes, handle all children
    if (node.nodeType === 1) {
        // Use a static copy of child nodes in case the list is modified during iteration
        const children = Array.from(node.childNodes);
        for (const child of children) {
            cleanupNode(child);
        }
    }

    // Process text nodes
    if (node.nodeType === 3 && node.textContent) {
        let currentText = node.textContent;
        let modified = false;
        for (const regex of deletionRegexes) {
            if (regex.test(currentText)) {
                currentText = currentText.replace(regex, '');
                modified = true;
            }
        }
        // Only update the DOM if a change was made to avoid unnecessary mutation events
        if (modified) {
            node.textContent = currentText;
        }
    }
}

/**
  * Translates a single DOM node and its children.
  * @param node The DOM node to translate.
  */
 async function translateNode(node: Node): Promise<void> {
    // Step 0: Clean the node using deletion regexes before doing anything else.
    cleanupNode(node);

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

        // 1. Perform an initial translation of the entire document body
        // The custom dictionary is assumed to be initialized and parsed already.
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
