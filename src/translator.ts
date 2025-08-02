// --- Start of STV Translator Code ---
// Helper functions
function g(i: string): HTMLElement | null {
    return document.getElementById(i);
}

function q<E extends Element = Element>(i: string): NodeListOf<E> {
    return document.querySelectorAll(i);
}

import { getSettingValue } from '@/util/extension_variables';
import { defaultIframeSettings } from './component/message_iframe';

// Core settings object
const setting = {
    enable: true, // This will be controlled by the settings panel
    heightauto: false, // Disabled by default to prevent UI conflicts
    widthauto: false,
    scaleauto: false, // Disabled by default to prevent UI conflicts
    enableajax: true,
    enablescript: true,
    strictarial: false,
    stvserver: "comic.sangtacvietcdn.xyz/tsm.php?cdn=",
    delaytrans: 120,
    delaymutation: 200,
    namedata: "",
};

// Name replacement functionality
let namedata = "";
let namedatacache: [RegExp, string][] | null = null;
function replaceName(text: string): string {
    let t = text;
    if (namedatacache) {
        for (let i = 0; i < namedatacache.length; i++) {
            t = t.replace(namedatacache[i][0], namedatacache[i][1]);
        }
        return t;
    }
    namedatacache = [];
    const n = namedata.split("\n");
    for (let i = 0; i < n.length; i++) {
        const m = n[i].trim().split("=");
        if (m[0] && m[1]) {
            const r = new RegExp(m[0], "g");
            namedatacache.push([r, m[1]]);
            t = t.replace(r, m[1]);
        }
    }
    return t;
}

// Layout and overflow handling
function checkOverflow(el: Element) {
    const stl = getComputedStyle(el);
    const curOverflow = stl.overflow;
    if (curOverflow === "auto" || curOverflow === "hidden") {
        return false;
    }
    return el.clientWidth < el.scrollWidth || el.clientHeight < el.scrollHeight;
}

function removeOverflow() {
    // This function can be very aggressive. For now, we keep it simple.
    // A more targeted approach might be needed if it breaks Tavern's UI.
    q("div:not([calculated]), nav, main:not([calculated]), section:not([calculated])").forEach(e => {
        e.setAttribute("calculated", "true");
        const stl = getComputedStyle(e);
        if (checkOverflow(e)) {
            if (setting.heightauto) {
                (e as HTMLElement).style.height = "auto";
            }
            if (setting.widthauto) {
                (e as HTMLElement).style.width = "auto";
            }
        }
    });
}

// Core translation logic
let realtimeTranslateLock = false;
const chineseRegex = /[\u3400-\u9FBF]/;
const oldSend = XMLHttpRequest.prototype.send;

function recurTraver(node: Node, arr: Node[], tarr: string[]) {
    if (!node) return;
    for (let i = 0; i < node.childNodes.length; i++) {
        const childNode = node.childNodes[i];
        if (childNode.nodeType === 3) { // Text node
            if (chineseRegex.test(childNode.textContent!)) {
                arr.push(childNode);
                tarr.push(childNode.textContent!);
            }
        } else if (childNode.nodeType === 1) { // Element node
            const tagName = (childNode as Element).tagName;
            if (tagName !== "SCRIPT" && tagName !== "STYLE") {
                recurTraver(childNode, arr, tarr);
            }
        }
    }
}

function poporgn(this: HTMLElement) {
    let t = "";
    for (let i = 0; i < this.childNodes.length; i++) {
        if (this.childNodes[i].nodeType === 3) {
            t += (this.childNodes[i] as any).orgn || "";
        }
    }
    this.setAttribute("title", t);
}

async function realtimeTranslate() {
    if (realtimeTranslateLock || !setting.enable) {
        return;
    }
    realtimeTranslateLock = true;
    setTimeout(() => {
        realtimeTranslateLock = false;
    }, setting.delaytrans);

    const totranslist: Node[] = [];
    const transtext: string[] = [];
    recurTraver(document.body, totranslist, transtext);

    if (totranslist.length > 0) {
        const transtext2 = transtext.join("=|==|=");
        const ajax = new XMLHttpRequest();
        ajax.onreadystatechange = function () {
            if (this.readyState == 4 && this.status == 200) {
                const translateds = this.responseText.split("=|==|=");
                for (let i = 0; i < totranslist.length; i++) {
                    if (totranslist[i] && translateds[i]) {
                        (totranslist[i] as any).orgn = transtext[i];
                        totranslist[i].textContent = translateds[i];
                        const parentElement = totranslist[i].parentElement;
                        if (parentElement && !(parentElement as any).popable) {
                            parentElement.addEventListener("mouseenter", poporgn);
                            (parentElement as any).popable = true;
                        }
                    }
                }
                if (setting.heightauto || setting.widthauto || setting.scaleauto) {
                    removeOverflow();
                }
                invokeOnChinesePage();
            }
        };
        ajax.open("POST", `//${setting.stvserver}/`, true);
        ajax.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
        oldSend.apply(ajax, ["sajax=trans&content=" + encodeURIComponent(replaceName(transtext2))]);
    }
}

// Mutation observer to handle dynamic content
function invokeOnChinesePage() {
    if ((window as any).translatorMutationObserver) return;

    // Target a more specific element to avoid conflicts. #chat-log is a common ID for chat histories.
    const chatLog = document.getElementById('chat-log');
    if (!chatLog) {
        console.warn('Translator: Could not find #chat-log element to observe.');
        // Fallback to body, but with a warning.
        const observer = new MutationObserver(() => {
            realtimeTranslate();
        });
        observer.observe(document.body, { childList: true, subtree: true, characterData: true });
        (window as any).translatorMutationObserver = observer;
        return;
    }

    const observer = new MutationObserver(() => {
        realtimeTranslate();
    });

    observer.observe(chatLog, { childList: true, subtree: true, characterData: true });
    (window as any).translatorMutationObserver = observer;
}

// Initialization function
export function initTranslator() {
    // Load settings from SillyTavern's system
    setting.enable = getSettingValue('render.translator_enabled') ?? defaultIframeSettings.translator_enabled;

    if (!setting.enable) {
        return;
    }

    // Initial translation after a short delay
    setTimeout(realtimeTranslate, 1000);

    // Set up mutation observer for dynamic content
    invokeOnChinesePage();
}
// --- End of STV Translator Code ---
