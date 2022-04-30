import qrCode from "qrcode";
import { createPhysicalAnimator } from "./physical-element-animator";

function handleAsyncError(promise: Promise<void>) {
    promise.catch((error) => console.error(error));
}
function waitElementLoaded() {
    if (document.readyState !== "loading") {
        return Promise.resolve();
    }
    return new Promise<void>((resolve) =>
        document.addEventListener("DOMContentLoaded", () => resolve())
    );
}
function sleep(milliseconds: number) {
    return new Promise<void>((resolve) => setTimeout(resolve, milliseconds));
}
let styleElement: HTMLStyleElement | null = null;
function addStyle(css: string): void;
function addStyle(
    template: TemplateStringsArray,
    ...substitutions: unknown[]
): void;
function addStyle(
    cssOrTemplate: TemplateStringsArray | string,
    ...substitutions: unknown[]
) {
    const css =
        typeof cssOrTemplate === "string"
            ? cssOrTemplate
            : String.raw(cssOrTemplate, ...substitutions);

    if (styleElement == null) {
        styleElement = document.createElement("style");
        document.head.appendChild(styleElement);
    }
    styleElement.textContent += css + "\n";
    document.head.appendChild(styleElement);
}

function getCodes(contents: string) {
    return [...contents.matchAll(/(\d\s*){12}/g)].map((match) =>
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        match[0]!.replace(/\s/g, "")
    );
}
let domParser: DOMParser | null = null;
async function createQRCodeImage(code: string) {
    const svgContents = await qrCode.toString(code, { type: "svg" });
    const document = (domParser ??= new DOMParser()).parseFromString(
        svgContents,
        "image/svg+xml"
    ) as XMLDocument;
    return document.firstChild as SVGSVGElement;
}
async function asyncMain() {
    await waitElementLoaded();

    const idContainerName = "id-code-container";
    const qrNumberName = "qr-number";
    const qrContainerName = "qr-container";
    const qrCheckboxName = "qr-checkbox";
    const qrLabelName = "qr-label";
    const qrImageContainerName = "qr-image-container";
    const qrChasingName = "qr-chasing";
    const qrDraggingName = "qr-dragging";
    addStyle`
        .${idContainerName} {
            float: right;
            display: flex;
            padding: 0;
            margin: 0 0.5em;
            border: 2px solid #ddd;
        }
        .${qrNumberName} {
            padding: 0 0.5em;
            border-right: 2px dashed #ddd;
        }
        .${qrImageContainerName} {
            position: fixed;
            top: 50%;
            left: 50%;
            z-index: 9999;
            cursor: grab;

            border-radius: 50%;
            background: rgb(255 255 255 / 20%);
            padding: 1.5em;
            box-shadow: 0 0.2em 1em 0.5em rgb(0 0 0 / 10%);
            border: solid 1px #ccc;
            backdrop-filter: blur(0.3em);

            transition:
                background 1s,
                box-shadow 1s,
                border 1s,
                transform 0.2s ease-out,
                opacity 0.2s ease-out;

            width: 4em;
            height: 4em;
            transform: scale(0.1);
            opacity: 0;
        }
        .${qrImageContainerName}:hover {
            background: rgb(192 164 197 / 20%);
            box-shadow: 0 0.2em 1em 0.5em rgb(250 220 255 / 30%);
            border: solid 1px #cab8cb;
        }
        .${qrImageContainerName}.${qrChasingName} {
            background: rgb(131 179 193 / 20%);
            box-shadow: 0 0.2em 1em 0.5em rgb(171 236 255 / 30%);
            border: solid 1px #afc6c7;
        }
        .${qrImageContainerName}.${qrDraggingName} {
            background: rgb(187 134 197 / 20%);
            box-shadow: 0 0.2em 1em 0.5em rgb(243 177 255 / 30%);
            border: solid 1px #c9a6cb;
        }
        .${qrCheckboxName}:checked + .${qrLabelName} + .${qrImageContainerName} {
            transform: scale(1);
            opacity: 1;
        }
        .${qrCheckboxName} {
            display: none;
        }
        `;
    const toastListName = "qr-toast-list";
    const toastItemName = "qr-toast-item";
    addStyle`
        .${toastListName} {
            position: fixed;
            right: 0;
            bottom: 0;
            z-index: 9999;
            list-style: none;
            padding: 0;
            margin: 0;
        }
        .${toastItemName}:first-of-type {
            border-top: 1px solid #ddd;
        }
        .${toastItemName} {
            background-color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            border-top: 1px dashed #ccc;
            margin: 0 0.5em;
            padding: 1em;
            box-shadow: 0 2px 2px rgb(0 0 0 / 50%);
        }
    `;
    const toastListElement = document.createElement("ul");
    toastListElement.classList.add(toastListName);
    document.body.appendChild(toastListElement);
    async function toastAsync(message: string, { timeout = 3000 } = {}) {
        const item = document.createElement("li");
        item.innerText = message;
        item.classList.add(toastItemName);
        toastListElement.insertBefore(item, toastListElement.firstElementChild);
        await sleep(timeout);
        item.parentElement?.removeChild(item);
    }
    function toast(...args: Parameters<typeof toastAsync>) {
        handleAsyncError(toastAsync(...args));
    }

    let nextCheckboxId = 0;
    async function createQRButton(code: string) {
        const qrButton = document.createElement("span");
        qrButton.classList.add(qrContainerName);

        const checkboxId = `qr-checkbox-${nextCheckboxId++}`;
        qrButton.innerHTML = `
            <input type="checkbox" class="${qrCheckboxName}" id="${checkboxId}" />
            <label type="button" class="${qrLabelName}" for="${checkboxId}" title="QR コードを表示">QR 📸</label>
            <div class="${qrImageContainerName}"></div>
        `;
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const qrImageContainer = qrButton.querySelector(
            `.${qrImageContainerName}`
        ) as HTMLElement;

        const qrImage = await createQRCodeImage(code);
        qrImageContainer.appendChild(qrImage);

        const animator = createPhysicalAnimator(qrImageContainer, {
            draggingClassName: qrDraggingName,
            chasingClassName: qrChasingName,
            initialChasingTargetElement: qrButton,
        });
        qrButton.querySelector("input")?.addEventListener("click", function () {
            if (this.checked) {
                document
                    .querySelectorAll(`input.${qrCheckboxName}`)
                    .forEach((element) => {
                        const otherCheckbox = element as HTMLInputElement;
                        if (otherCheckbox !== this) {
                            otherCheckbox.checked = false;
                        }
                    });
                animator.start();
            } else {
                animator.stop();
            }
        });

        return qrButton;
    }
    async function appendTrainerCodeUI() {
        for (const commentElement of Array.from(
            document.querySelectorAll(".trainer_code")
        )) {
            const parentElement = commentElement.parentElement;
            if (parentElement == null) {
                console.error("親要素が見つかりませんでした。");
                continue;
            }
            const comment = commentElement.textContent ?? "";
            const codes = getCodes(comment);
            if (codes[0] == null) {
                console.error("コードが見つかりませんでした。");
                continue;
            }
            if (1 < codes.length) {
                console.warn("想定外の複数のコードが見つかりました。");
            }
            const code = codes[0];
            const idContainerElement = document.createElement("span");
            idContainerElement.classList.add(idContainerName);
            idContainerElement.appendChild(await createQRButton(code));
            parentElement.appendChild(idContainerElement);
        }
    }
    await appendTrainerCodeUI();
}
export function main() {
    handleAsyncError(asyncMain());
}
