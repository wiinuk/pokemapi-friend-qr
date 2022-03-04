import qrCode from "qrcode";
import {
    numberWith,
    seconds,
    Unit,
    withUnit as unit,
    id,
    Id,
    mul,
    meter,
    div,
    add,
    sub,
    UnitKind,
    MulU,
    DivU,
    sqrt,
    max,
    lt,
    withoutUnit,
} from "./units";
import { addV2, distance, mulV2, normalizeV2, subV2, vector2 } from "./vector2";

type px = Unit<"px">;
const px: Id<px> = id;
const meterParSeconds: Id<DivU<meter, seconds>> = id;

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

type RenderContext = {
    frameTimeSpan: numberWith<seconds>;
};
type Renderer = (context: Readonly<RenderContext>) => void;
let lastFrameCancellationHandle: number | null = null;
const renderers: Renderer[] = [];
const context: RenderContext = { frameTimeSpan: unit(0.1, seconds) };
function frameMainLoop(time: DOMHighResTimeStamp) {
    context.frameTimeSpan = unit(time * 0.001, seconds);
    for (const render of renderers) {
        render(context);
    }
    lastFrameCancellationHandle =
        globalThis.requestAnimationFrame(frameMainLoop);
}

function addRenderer(render: Renderer) {
    if (renderers.length === 0) {
        globalThis.requestAnimationFrame(frameMainLoop);
        console.debug("アニメーションループ開始");
    }
    renderers.push(render);
}
function removeRenderer(render: Renderer) {
    renderers.splice(renderers.indexOf(render), 1);
    if (renderers.length === 0) {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        globalThis.cancelAnimationFrame(lastFrameCancellationHandle!);
        console.debug("アニメーションループ停止");
        lastFrameCancellationHandle = null;
    }
}
function fontSizeAtElement(element: Element) {
    return unit(
        Number(getComputedStyle(element).fontSize.match(/(\d+)px/)?.[1]),
        px
    );
}
type DOMRectWithUnit = {
    [k in keyof DOMRect]: DOMRect[k] extends number
        ? numberWith<px>
        : DOMRect[k];
};
function getBoundingClientRect(element: Element) {
    if (element.parentElement === null) {
        return;
    }
    const style = getComputedStyle(element);
    if (style.visibility === "hidden") {
        return;
    }
    return element.getBoundingClientRect() as unknown as DOMRectWithUnit;
}

interface Circle<u extends UnitKind> {
    readonly center: vector2<u>;
    readonly radius: numberWith<u>;
}

function isCollision<u extends UnitKind>(c1: Circle<u>, c2: Circle<u>) {
    return lt(distance(c1.center, c2.center), add(c1.radius, c2.radius));
}
function boundToShape(
    rect: DOMRectWithUnit,
    meterParPx: numberWith<DivU<meter, px>>
): Circle<meter> | undefined {
    if (rect == null) {
        return;
    }
    return {
        center: [
            mul(rect.left, meterParPx),
            mul(rect.top, meterParPx),
            // mul(mul(add(rect.left, rect.right), unit(0.5)), meterParPx),
            // mul(mul(add(rect.top, rect.bottom), unit(0.5)), meterParPx),
        ],
        radius: mul(max(rect.width, rect.height), mul(unit(0.5), meterParPx)),
    };
}

async function asyncMain() {
    await waitElementLoaded();

    const idContainerName = "id-code-container";
    const qrNumberName = "qr-number";
    const qrContainerName = "qr-container";
    const qrCheckboxName = "qr-checkbox";
    const qrLabelName = "qr-label";
    const qrImageContainerName = "qr-image-container";
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

            border-radius: 50%;
            background: rgba(255, 255, 255, 20%);
            padding: 1.5em;
            box-shadow: 0 0.2em 1em 0.5em rgb(0 0 0 / 10%);
            border: solid 1px #ccc;
            backdrop-filter: blur(0.3em);

            width: 0;
            height: 0;
            visibility: hidden;
        }
        .${qrCheckboxName}:checked + .${qrLabelName} + .${qrImageContainerName} {
            width: 4em;
            height: 4em;
            visibility: visible;
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
    async function toast(message: string, { timeout = 3000 } = {}) {
        const item = document.createElement("li");
        item.innerText = message;
        item.classList.add(toastItemName);
        toastListElement.insertBefore(item, toastListElement.firstElementChild);
        await sleep(timeout);
        item.parentElement?.removeChild(item);
    }
    let nextCheckboxId = 0;

    /** `m/px` */
    const meterParPx = (() => {
        const x = document.createElement("div");
        try {
            x.style.fontSize = "1em";
            x.appendChild(document.createTextNode("x"));
            document.body.appendChild(x);
            return div(unit(1, meter), fontSizeAtElement(x));
        } finally {
            x.remove();
        }
    })();
    function toCssPosition(x: numberWith<meter>) {
        return Math.round(withoutUnit<px>(div(x, meterParPx))) + "px";
    }
    async function createQRButton(code: string) {
        const qrButton = document.createElement("span");
        qrButton.classList.add(qrContainerName);
        qrButton.title = "QR コードを表示";

        const checkboxId = `qr-checkbox-${nextCheckboxId++}`;
        qrButton.innerHTML = `
            <input type="checkbox" class="${qrCheckboxName}" id="${checkboxId}" />
            <label type="button" class="${qrLabelName}" for="${checkboxId}">QR 📸</label>
            <div class="${qrImageContainerName}"></div>
        `;
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const qrImageContainer = qrButton.querySelector(
            `.${qrImageContainerName}`
        ) as HTMLElement;

        const qrImage = await createQRCodeImage(code);
        qrImageContainer.appendChild(qrImage);

        // 追いかけるときの加速度
        type acceleration = DivU<meter, MulU<seconds, seconds>>;
        const acceleration = unit<acceleration>(0.001, id);
        // 表示されていないので初期位置が不明
        let position: vector2<meter> | null = null;
        function createVelocity() {
            return vector2(
                unit((Math.random() - 0.5) * 0.05, meterParSeconds),
                unit((Math.random() - 0.5) * 0.05, meterParSeconds)
            );
        }
        let velocity = createVelocity();

        const selfAnimator: Renderer = (context) => {
            // 自分と対象の形を決定
            const selfRect = getBoundingClientRect(qrImageContainer);
            const targetRect = getBoundingClientRect(qrButton);
            const self = selfRect
                ? boundToShape(selfRect, meterParPx)
                : undefined;
            const target = targetRect
                ? (() => {
                      const r = boundToShape(targetRect, meterParPx);
                      if (!r) {
                          return;
                      }
                      return { ...r, radius: mul(r.radius, unit(2)) };
                  })()
                : undefined;

            // 初期位置の決定
            if (target && position === null) {
                position = target.center;
            }
            // 初期位置が決定していないならなにもしない
            if (position === null) {
                return;
            }

            // 双方が表示されていて、接触していないなら対象を追いかける
            if (self && target && !isCollision(target, self)) {
                // 対象への方向を計算
                const direction = normalizeV2(
                    subV2(target.center, self.center)
                );
                // 対象の方向へ加速
                velocity = addV2(
                    velocity,
                    mulV2(mul(context.frameTimeSpan, acceleration), direction)
                );
            }

            // 物理演算
            // 空気抵抗
            velocity = mulV2(velocity, unit(0.7));
            // 移動
            position = addV2(position, mulV2(context.frameTimeSpan, velocity));

            // スタイルを設定
            if (selfRect) {
                const leftTop = subV2(
                    position,
                    mulV2(
                        vector2(selfRect.width, selfRect.height),
                        mul(meterParPx, unit(0.5))
                    )
                );

                qrImageContainer.style.left = toCssPosition(leftTop[0]);
                qrImageContainer.style.top = toCssPosition(leftTop[1]);
            }
        };
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
                addRenderer(selfAnimator);
            } else {
                removeRenderer(selfAnimator);
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
