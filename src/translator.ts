// Các URL máy chủ dịch
const stvServer = "comic.sangtacvietcdn.xyz/tsm.php?cdn=";
const dichNhanhServer = "api.dichnhanh.com";

// Biến lưu trữ nhà cung cấp dịch thuật hiện tại
let currentTranslationProvider = "stv"; // Mặc định là SangTacViet

const chineseRegex = /[\u3400-\u9FBF]/;
const oldOpen = XMLHttpRequest.prototype.open;
const oldSend = XMLHttpRequest.prototype.send;

// --- Global XHR Interceptor for Data Cleaning ---
XMLHttpRequest.prototype.open = function (method: string, url: string | URL) {
    // Store the URL for later checks in send()
    this._url = url;
    return oldOpen.apply(this, arguments as any);
};

XMLHttpRequest.prototype.send = function (body) {
    const originalOnReadyStateChange = this.onreadystatechange;

    this.onreadystatechange = function () {
        // Only process when the request is complete and successful
        if (this.readyState === 4 && this.status === 200) {
            // Check if this is a response we want to modify (e.g., chat history)
            // This URL part is an assumption and might need adjustment for different Tavern versions.
            const isChatUrl = typeof this._url === 'string' && (this._url.includes('/api/chats/') || this._url.includes('get_chat_ajax'));

            if (isChatUrl && this.responseText) {
                try {
                    let responseData = JSON.parse(this.responseText);
                    let modified = false;

                    // The actual data structure might be responseData.chat.messages or similar
                    // We need to find the array of messages. This is a common structure.
                    const messages = responseData.chat?.messages || responseData.messages || responseData;

                    if (Array.isArray(messages)) {
                        for (const message of messages) {
                            // Look for the message content field, typically 'mes' or 'message'
                            if (typeof message.mes === 'string') {
                                let originalMes = message.mes;
                                for (const regex of deletionRegexes) {
                                    message.mes = message.mes.replace(regex, '');
                                }
                                if (originalMes !== message.mes) {
                                    modified = true;
                                }
                            }
                        }
                    }

                    if (modified) {
                        const cleanedResponseText = JSON.stringify(responseData);
                        // Redefine the responseText property to return our modified version
                        Object.defineProperty(this, 'responseText', {
                            value: cleanedResponseText,
                            writable: false,
                        });
                    }
                } catch (e) {
                    console.error("Translator (Cleaner): Failed to parse or modify response.", e);
                }
            }
        }

        // Call the original onreadystatechange handler if it exists
        if (originalOnReadyStateChange) {
            originalOnReadyStateChange.apply(this, arguments as any);
        }
    };

    return oldSend.apply(this, arguments as any);
};

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
 * Finds the chat iframe and triggers a full re-translation.
 */
function refreshTranslation() {
    const iframe = document.querySelector('iframe[name="chat_iframe"]') as HTMLIFrameElement | null;
    if (iframe) {
        translateIframeContent(iframe);
    }
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
                // Add 'g' (global) and 's' (dotAll for multiline) flags for robust replacement
                newRegexes.push(new RegExp(trimmedLine, 'gs'));
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
    // Initialize Translation Provider
    const providerSelect = document.getElementById('translation-provider') as HTMLSelectElement | null;
    if (providerSelect) {
        // Đọc lựa chọn từ localStorage hoặc sử dụng giá trị mặc định
        const savedProvider = localStorage.getItem('translation-provider') || 'stv';
        providerSelect.value = savedProvider;
        currentTranslationProvider = savedProvider;
        
        // Thiết lập event listener để lưu lựa chọn khi thay đổi
        providerSelect.addEventListener('change', () => {
            const selectedProvider = providerSelect.value;
            localStorage.setItem('translation-provider', selectedProvider);
            currentTranslationProvider = selectedProvider;
            refreshTranslation(); // Dịch lại nội dung với nhà cung cấp mới
        });
    }

    // Initialize Custom Dictionary
    const dictionaryTextarea = document.getElementById('custom-dictionary') as HTMLTextAreaElement | null;
    if (dictionaryTextarea) {
        dictionaryTextarea.value = localStorage.getItem('custom-dictionary') || '';
        parseCustomDictionary(); // Initial parse
        dictionaryTextarea.addEventListener('input', () => {
            parseCustomDictionary();
            refreshTranslation();
        });
        dictionaryTextarea.addEventListener('change', saveCustomDictionary);
    }

    // Initialize Deletion Regexes
    const regexTextarea = document.getElementById('deletion-regexes') as HTMLTextAreaElement | null;
    if (regexTextarea) {
        regexTextarea.value = localStorage.getItem('deletion-regexes') || '';
        parseDeletionRegexes(); // Initial parse
        regexTextarea.addEventListener('input', () => {
            parseDeletionRegexes();
            refreshTranslation();
        });
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

    // Step 1: Áp dụng regex xóa nội dung không mong muốn
    if (deletionRegexes.length > 0) {
        originalTexts = originalTexts.map(text => {
            let processedText = text;
            for (const regex of deletionRegexes) {
                processedText = processedText.replace(regex, '');
            }
            return processedText;
        });
    }

    // Step 2: Pre-process texts. Replace dictionary words with placeholders.
    originalTexts.forEach(text => {
        let processedText = text;
        const currentPlaceholderMap = new Map<string, string>();
        let placeholderIndex = 0;

        // Sort dictionary keys by length descending to match longer keys first
        const sortedKeys = Array.from(customDictionary.keys()).sort((a, b) => b.length - a.length);

        // Helper function to escape regex special characters
        const escapeRegExp = (string: string) => {
            return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        };

        sortedKeys.forEach(original => {
            const translated = customDictionary.get(original)!;
            if (processedText.includes(original)) {
                const placeholder = `__D${placeholderIndex}__`;
                // Use a regex with escaped original string to replace all occurrences
                processedText = processedText.replace(new RegExp(escapeRegExp(original), 'g'), placeholder);
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

    // Tùy thuộc vào nhà cung cấp dịch được chọn
    if (currentTranslationProvider === 'stv') {
        // Sử dụng SangTacViet API
        return translateWithSTV(joinedText, placeholderMaps);
    } else if (currentTranslationProvider === 'dichnhanh') {
        // Sử dụng DichNhanh API
        return translateWithDichNhanh(joinedText, placeholderMaps);
    } else {
        // Mặc định sử dụng SangTacViet nếu không xác định được
        console.warn(`Translator: Unknown provider "${currentTranslationProvider}", falling back to SangTacViet`);
        return translateWithSTV(joinedText, placeholderMaps);
    }
}

/**
 * Dịch văn bản sử dụng API SangTacViet
 */
function translateWithSTV(joinedText: string, placeholderMaps: Map<string, string>[]): Promise<string[]> {
    return new Promise((resolve, reject) => {
        const ajax = new XMLHttpRequest();
        ajax.onreadystatechange = function () {
            if (this.readyState == 4) {
                if (this.status == 200) {
                    const translatedFromServer = this.responseText.split("=|==|=");
                    
                    // Post-process. Replace placeholders back.
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
                    reject(new Error(`SangTacViet translation server failed with status ${this.status}`));
                }
            }
        };
        ajax.open("POST", `//${stvServer}/`, true);
        ajax.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
        // Use the original send method for our own requests to avoid loops
        oldSend.apply(ajax, ["sajax=trans&content=" + encodeURIComponent(joinedText)]);
    });
}

/**
 * Dịch văn bản sử dụng API DichNhanh
 */
function translateWithDichNhanh(joinedText: string, placeholderMaps: Map<string, string>[]): Promise<string[]> {
    return new Promise((resolve, reject) => {
        try {
            const ajax = new XMLHttpRequest();
            
            // Thiết lập xử lý lỗi và fallback
            let fallbackToSTV = false;
            
            ajax.onreadystatechange = function () {
                if (this.readyState == 4) {
                    if (this.status == 200) {
                        try {
                            // DichNhanh trả về JSON
                            const response = JSON.parse(this.responseText);
                            
                            // Kiểm tra xem có dữ liệu dịch không
                            if (response && response.data && response.data.text) {
                                // DichNhanh trả về một chuỗi duy nhất, cần tách lại thành mảng
                                const translatedText = response.data.text;
                                const translatedFromServer = translatedText.split("=|==|=");
                                
                                // Post-process. Replace placeholders back.
                                const finalResults = translatedFromServer.map((text, i) => {
                                    let result = text;
                                    const currentPlaceholderMap = placeholderMaps[i];
                                    currentPlaceholderMap.forEach((translated, placeholder) => {
                                        result = result.replace(new RegExp(placeholder, 'g'), translated);
                                    });
                                    return result;
                                });
                                resolve(finalResults);
                            } else {
                                console.warn("DichNhanh translation server returned invalid data, falling back to SangTacViet");
                                fallbackToSTV = true;
                                translateWithSTV(joinedText, placeholderMaps).then(resolve).catch(reject);
                            }
                        } catch (e) {
                            console.warn(`Failed to parse DichNhanh response: ${e.message}, falling back to SangTacViet`);
                            fallbackToSTV = true;
                            translateWithSTV(joinedText, placeholderMaps).then(resolve).catch(reject);
                        }
                    } else if (this.status !== 0) { // Bỏ qua status 0 vì nó thường là lỗi CORS
                        console.warn(`DichNhanh translation server failed with status ${this.status}, falling back to SangTacViet`);
                        fallbackToSTV = true;
                        translateWithSTV(joinedText, placeholderMaps).then(resolve).catch(reject);
                    }
                }
            };
            
            // Xử lý lỗi CORS và các lỗi khác
            ajax.onerror = function() {
                console.warn("Error occurred with DichNhanh API (likely CORS), falling back to SangTacViet");
                if (!fallbackToSTV) {
                    fallbackToSTV = true;
                    translateWithSTV(joinedText, placeholderMaps).then(resolve).catch(reject);
                }
            };
            
            // Thiết lập timeout để tránh chờ quá lâu
            ajax.timeout = 5000; // 5 giây
            ajax.ontimeout = function() {
                console.warn("DichNhanh API request timed out, falling back to SangTacViet");
                if (!fallbackToSTV) {
                    fallbackToSTV = true;
                    translateWithSTV(joinedText, placeholderMaps).then(resolve).catch(reject);
                }
            };
            
            // Thử sử dụng CORS proxy nếu có thể
            // Lưu ý: Đây là một proxy công cộng, có thể không ổn định hoặc bị giới hạn
            const corsProxy = "https://corsproxy.io/?";
            const apiUrl = `${corsProxy}https://${dichNhanhServer}/`;
            
            ajax.open("POST", apiUrl, true);
            ajax.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
            ajax.setRequestHeader("accept", "application/json, text/plain, */*");
            
            // Bỏ các header không an toàn
            // ajax.setRequestHeader("accept-language", "vi,en-US;q=0.9,en;q=0.8");
            // ajax.setRequestHeader("user-agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36");
            
            // Chuẩn bị dữ liệu cho DichNhanh API
            const data = `type=Ancient&enable_analyze=1&enable_fanfic=0&mode=vi&text=${encodeURIComponent(joinedText)}&remove=`;
            
            // Use the original send method for our own requests to avoid loops
            oldSend.apply(ajax, [data]);
        } catch (error) {
            console.error("Failed to initialize DichNhanh translation request:", error);
            // Fallback to STV in case of any initialization errors
            translateWithSTV(joinedText, placeholderMaps).then(resolve).catch(reject);
        }
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
    // Proceed with translation on the DOM
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

// Use a WeakMap to store the observer for each iframe, allowing us to disconnect it later.
const observedIframes = new WeakMap<HTMLIFrameElement, MutationObserver>();

/**
 * Finds all Chinese text within a live iframe's body, translates it,
 * and replaces the content in-place. It also sets up a MutationObserver
 * to handle dynamically loaded content.
 * @param iframe The live HTMLIFrameElement to translate.
 */
export async function translateIframeContent(iframe: HTMLIFrameElement): Promise<void> {
    try {
        // If an observer is already attached to this iframe, disconnect it first.
        // This ensures we're starting fresh when rules are updated.
        if (observedIframes.has(iframe)) {
            observedIframes.get(iframe)?.disconnect();
        }

        const body = iframe.contentWindow?.document.body;
        if (!body) {
            console.error("Translator: Iframe body not found.");
            return;
        }

        // 1. Perform an initial translation of the entire document body
        await translateNode(body);

        // 2. Set up a new observer to handle dynamically added/changed content
        const observer = new MutationObserver(async (mutations) => {
            // Disconnect the observer temporarily to prevent infinite loops during translation
            observer.disconnect();

            const nodesToTranslate = new Set<Node>();
            for (const mutation of mutations) {
                // Logic to collect nodes remains the same...
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

            // Reconnect the observer to watch for future changes
            startObserver(observer, body);
        });

        // 3. Start observing and store the new observer in our map
        startObserver(observer, body);
        observedIframes.set(iframe, observer);

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
