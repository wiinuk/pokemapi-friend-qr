import {
    add,
    DivU,
    id,
    Id,
    lt,
    meter,
    mul,
    numberWith,
    seconds,
    withUnit as unit,
    Unit,
    UnitKind,
    max,
    div,
    MulU,
    withoutUnit,
    dimensionless,
    sub,
    kilogram,
} from "./units";
import {
    addV2,
    distance as getDistance,
    divV2,
    lengthV2,
    mulV2,
    normalizeV2,
    subV2,
    vector2,
} from "./vector2";

type px = Unit<"px">;
const px: Id<px> = id;
const meterParSeconds: Id<DivU<meter, seconds>> = id;

function unreachable(): never {
    throw new Error("unreachable");
}
function exhaustive(_: never) {
    throw new Error("exhaustive");
}

interface Circle<u extends UnitKind> {
    readonly center: vector2<u>;
    readonly radius: numberWith<u>;
}

function isCollision<u extends UnitKind>(c1: Circle<u>, c2: Circle<u>) {
    return lt(getDistance(c1.center, c2.center), add(c1.radius, c2.radius));
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
function boundToShape(
    rect: DOMRectWithUnit,
    meterParPx: numberWith<DivU<meter, px>>
): Circle<meter> {
    return {
        center: vector2(
            mul(mul(add(rect.right, rect.left), unit(0.5)), meterParPx),
            mul(mul(add(rect.bottom, rect.top), unit(0.5)), meterParPx)
        ),
        radius: mul(max(rect.width, rect.height), mul(unit(0.5), meterParPx)),
    };
}

interface DraggingInfo {
    /** ドラッグ対象の要素の中心座標とマウスが押された座標の差 */
    readonly offset: vector2<meter>;
    /** 現在のマウスの位置 */
    position: vector2<meter>;
}

type MainPointerEvent = TouchEvent | MouseEvent;
function addDragEventHandler(
    element: HTMLElement,
    options: {
        onDragMove?(e: MainPointerEvent): void;
        onDragStart?(e: MainPointerEvent): void;
        onDragEnd?(e: MainPointerEvent): void;
    } = {}
) {
    const { onDragMove, onDragStart, onDragEnd } = options;

    element.addEventListener("mousedown", onDown, false);
    element.addEventListener("touchstart", onDown, false);

    function onDown(e: MainPointerEvent) {
        onDragStart?.(e);
        document.body.addEventListener("mousemove", onMove, false);
        document.body.addEventListener("touchmove", onMove, false);
    }
    function onMove(e: MainPointerEvent) {
        onDragMove?.(e);
        e.preventDefault();

        document.body.addEventListener("mouseup", onRelease, false);
        document.body.addEventListener("touchend", onRelease, false);
        document.body.addEventListener("touchcancel", onRelease, false);
    }
    function onRelease(e: MainPointerEvent) {
        onDragEnd?.(e);

        document.body.removeEventListener("mousemove", onMove, false);
        document.body.removeEventListener("touchmove", onMove, false);

        document.body.removeEventListener("mouseup", onRelease, false);
        document.body.removeEventListener("touchend", onRelease, false);
        document.body.removeEventListener("touchcancel", onRelease, false);
    }
}
type SinglePointerEvent = MouseEvent | Touch;
type SinglePointerEventWithUnit = {
    [k in keyof SinglePointerEvent]: [SinglePointerEvent[k], k] extends [
        number,
        `x` | `y` | `${string}${`X` | `Y`}`
    ]
        ? numberWith<px>
        : SinglePointerEvent[k];
};
function getSinglePointerEvent(e: MainPointerEvent) {
    const r: SinglePointerEvent =
        e instanceof TouchEvent ? e.changedTouches[0] ?? unreachable() : e;
    return r as unknown as SinglePointerEventWithUnit;
}
type RenderContext = {
    frameTimeSpan: numberWith<seconds>;
};
type Renderer = (context: Readonly<RenderContext>) => void;

type CollisionId = number;
const renderContext: RenderContext = {
    frameTimeSpan: unit(0.1, seconds),
};
let lastTime = 0;
function startRenderLoop(time: DOMHighResTimeStamp) {
    // 前のフレームからの経過時間を測定
    renderContext.frameTimeSpan = unit(
        lastTime === 0 ? 1 / 60 : (lastTime - time) * 0.001,
        seconds
    );
    lastTime = time;
    for (const render of renderers) {
        render(renderContext);
    }
    renderLoopCancellation = globalThis.requestAnimationFrame(startRenderLoop);
}
const renderers: Renderer[] = [];
let renderLoopCancellation: ReturnType<typeof requestAnimationFrame> | null =
    null;
function addRenderer(render: Renderer) {
    if (renderers.length === 0) {
        globalThis.requestAnimationFrame(startRenderLoop);
        console.debug("アニメーションループ開始");
    }
    renderers.push(render);
}
function removeRenderer(render: Renderer) {
    renderers.splice(renderers.indexOf(render), 1);
    if (renderers.length === 0) {
        if (renderLoopCancellation !== null) {
            globalThis.cancelAnimationFrame(renderLoopCancellation);
            console.debug("アニメーションループ停止");
        }
        renderLoopCancellation = null;
    }
}

const colliders = new Set<Collider>();
let updateLoopCancellation: ReturnType<typeof setInterval> | null = null;

const updateInterval = unit(1 / 60, seconds);
function addCollider(collider: Collider) {
    if (colliders.size === 0) {
        updateLoopCancellation = globalThis.setInterval(
            updateFrame,
            withoutUnit(updateInterval) * 1000
        );
        console.debug("物理演算ループ開始");
    }
    colliders.add(collider);
}
function removeCollider(collider: Collider) {
    colliders.delete(collider);
    if (colliders.size === 0) {
        if (updateLoopCancellation !== null) {
            globalThis.clearTimeout(updateLoopCancellation);
            console.debug("物理演算ループ停止");
        }
        updateLoopCancellation = null;
    }
}
type UpdateContext = RenderContext;
const updateContext: UpdateContext = {
    frameTimeSpan: unit(0.1, seconds),
};
let lastUpdateTime = 0;
function updateFrame() {
    const time = performance.now();
    updateContext.frameTimeSpan =
        lastUpdateTime === 0
            ? updateInterval
            : unit((lastUpdateTime - time) * 0.001, seconds);
    lastUpdateTime = time;

    processCollision();
    updatePosition(updateContext);
}
const checkedCollisions = new Set<CollisionId>();
const contact: Contact = {
    isIntersecting: false,
    normal: vector2(unit(0, meter), unit(0, meter)),
    penetration: unit(0, meter),
    normalizedTime: unit(0),
};
function processCollision() {
    checkedCollisions.clear();
    try {
        // 衝突判定 & 応答
        let index1 = 0;
        const collidersCount = colliders.size;
        for (const collider1 of colliders) {
            let index2 = 0;
            for (const collider2 of colliders) {
                if (collider1 !== collider2) {
                    const collisionId =
                        Math.max(index1, index2) * collidersCount +
                        Math.min(index1, index2);
                    if (!checkedCollisions.has(collisionId)) {
                        checkedCollisions.add(collisionId);
                        contact.isIntersecting = false;
                        contactColliderVsCollider(
                            collider1,
                            collider2,
                            contact
                        );
                        collisionResponse(collider1, contact, collider2);
                    }
                }
                index2++;
            }
            index1++;
        }
    } finally {
        checkedCollisions.clear();
    }
}
export function createPhysicalAnimator(
    element: HTMLElement,
    {
        draggingClassName = "dragging",
        chasingClassName = "chasing",
        initialChasingTargetElement = undefined as undefined | Element,
    } = {}
): PhysicalAnimator {
    let draggingInfo: DraggingInfo | null = null;
    addDragEventHandler(element, {
        onDragMove(e) {
            const info = getSinglePointerEvent(e);
            if (draggingInfo) {
                draggingInfo.position = vector2(
                    mul(info.clientX, meterParPx),
                    mul(info.clientY, meterParPx)
                );
            }
        },
        onDragStart(e) {
            element.classList.add(draggingClassName);
            const info = getSinglePointerEvent(e);

            // マウスの位置
            const position = vector2(
                mul(info.clientX, meterParPx),
                mul(info.clientY, meterParPx)
            );

            // どこをつかんでいるか求める
            const { center: elementPosition } = boundToShape(
                getBoundingClientRect(element) ?? unreachable(),
                meterParPx
            );
            const offset = subV2(position, elementPosition);

            draggingInfo = {
                offset,
                position,
            };
        },
        onDragEnd() {
            element.classList.remove(draggingClassName);
            draggingInfo = null;
        },
    });

    const acceleration: Id<DivU<meter, MulU<seconds, seconds>>> = id;
    // 親ボタンを追いかけるときの加速度
    const targetAcceleration = unit(30, acceleration);
    // マウスを追いかけるときの加速度
    const draggingAcceleration = unit(500, acceleration);
    function createVelocity() {
        const v = 100;
        return vector2(
            unit((Math.random() - 0.5) * v, meterParSeconds),
            unit((Math.random() - 0.5) * v, meterParSeconds)
        );
    }
    // 表示されていないので初期位置が不明
    let collider: CircleCollider | null = null;

    function addChaseVelocity(
        collider: Collider,
        context: Readonly<RenderContext>,
        selfPosition: vector2<meter>,
        targetPosition: vector2<meter>,
        acceleration = targetAcceleration
    ) {
        // 対象への方向を計算
        const direction = normalizeV2(subV2(targetPosition, selfPosition));

        // 対象の方向へ加速
        addV2(
            collider.velocity,
            mulV2(mul(context.frameTimeSpan, acceleration), direction),
            collider.velocity
        );
    }
    const renderer: PhysicalAnimator = {
        stop() {
            if (collider) {
                removeCollider(collider);
                collider = null;
            }
            removeRenderer(selfAnimator);
        },
        start() {
            addRenderer(selfAnimator);
        },
        chasingTargetElement: initialChasingTargetElement,
    };
    let previousChasing = false;
    const selfAnimator: Renderer = (context) => {
        // 自分と対象の形を決定
        const selfRect = getBoundingClientRect(element);
        const targetRect = renderer.chasingTargetElement
            ? getBoundingClientRect(renderer.chasingTargetElement)
            : undefined;
        const self = selfRect ? boundToShape(selfRect, meterParPx) : undefined;
        if (self && collider) {
            self.center[0] = collider.center[0];
            self.center[1] = collider.center[1];
        }
        const target = targetRect
            ? (() => {
                  const r = boundToShape(targetRect, meterParPx);
                  return { ...r, radius: mul(r.radius, unit(2)) };
              })()
            : undefined;

        // 初期位置の決定
        if (target && collider === null) {
            collider = {
                colliderKind: ColliderKind.Circle,
                center: target.center,
                velocity: createVelocity(),
                radius: self?.radius ?? unit(0, meter),
                friction: unit(0.95),
                mass: unit(1, kilogram),
            };
            addCollider(collider);
        }
        // 初期位置が決定していないならなにもしない
        if (collider === null) {
            return;
        }
        // 表示されていないなら半径は 0 にする
        collider.radius = self?.radius ?? unit(0, meter);

        // 双方が表示されていてドラッグされていないとき接触していないなら対象を追いかける
        if (self && target && !draggingInfo && !isCollision(target, self)) {
            if (!previousChasing) {
                element.classList.add(chasingClassName);
                previousChasing = true;
            }
            addChaseVelocity(
                collider,
                context,
                self.center,
                target.center,
                targetAcceleration
            );
        } else {
            if (previousChasing) {
                element.classList.remove(chasingClassName);
                previousChasing = false;
            }
        }
        // ドラッグされているなら、マウスポインタを追いかける
        if (self && draggingInfo) {
            // つかんだ位置を追いかける
            const targetPosition = subV2(
                draggingInfo.position,
                draggingInfo.offset
            );
            addChaseVelocity(
                collider,
                context,
                self.center,
                targetPosition,
                draggingAcceleration
            );
        }

        // スタイルを設定
        if (selfRect) {
            const leftTop = subV2(
                collider.center,
                mulV2(
                    vector2(selfRect.width, selfRect.height),
                    mul(meterParPx, unit(0.5))
                )
            );

            element.style.left = toCssPosition(leftTop[0]);
            element.style.top = toCssPosition(leftTop[1]);
        }
    };
    return renderer;
}

interface RigidBody {
    readonly center: vector2<meter>;
    readonly velocity: vector2<DivU<meter, seconds>>;
    friction: numberWith<dimensionless>;
    mass: numberWith<kilogram>;
}
interface CircleCollider extends RigidBody {
    colliderKind: ColliderKind.Circle;
    radius: numberWith<meter>;
}
interface BoxCollider extends RigidBody {
    colliderKind: ColliderKind.Box;
    readonly extend: vector2<meter>;
}
const enum ColliderKind {
    Circle,
    Box,
}
type Collider = CircleCollider | BoxCollider;

function collisionResponse(
    collider1: Collider,
    contact: Readonly<Contact>,
    collider2: Collider
) {
    if (!contact.isIntersecting) {
        return;
    }
    const velocity1 = collider1.velocity;
    const velocity2 = collider2.velocity;
    const normal = contact.normal;
    const p = div(
        mul(
            unit(2),
            sub(
                sub(
                    add(
                        mul(velocity1[0], normal[0]),
                        mul(velocity1[1], normal[1])
                    ),
                    mul(velocity2[0], normal[0])
                ),
                mul(velocity2[1], normal[1])
            )
        ),
        add(collider1.mass, collider2.mass)
    );

    subV2(
        collider1.velocity,
        mulV2(mul(p, collider1.mass), normal),
        collider1.velocity
    );
    addV2(
        collider2.velocity,
        mulV2(mul(p, collider2.mass), normal),
        collider2.velocity
    );
}
interface Contact {
    isIntersecting: boolean;
    readonly normal: vector2<dimensionless>;
    penetration: numberWith<meter>;
    normalizedTime: numberWith<dimensionless>;
}
function contactColliderVsCollider(
    collider1: Collider,
    collider2: Collider,
    result: Contact
) {
    switch (collider1.colliderKind) {
        case ColliderKind.Circle:
            switch (collider2.colliderKind) {
                case ColliderKind.Circle:
                    return contactCircleVsCircle(collider1, collider2, result);
                case ColliderKind.Box:
                    return contactCircleVsBox(collider1, collider2, result);
                default:
                    return exhaustive(collider2);
            }
        case ColliderKind.Box:
            switch (collider2.colliderKind) {
                case ColliderKind.Circle:
                    return contactCircleVsBox(collider2, collider1, result);
                case ColliderKind.Box:
                    return contactBoxVsBox(collider1, collider2, result);
                default:
                    return exhaustive(collider2);
            }
        default:
            return exhaustive(collider1);
    }
}
function contactCircleVsBox(
    collider1: CircleCollider,
    collider2: BoxCollider,
    result: Contact
) {
    // TODO:
    throw new Error("TODO");
}
function contactBoxVsBox(
    collider1: BoxCollider,
    collider2: BoxCollider,
    result: Contact
) {
    // TODO:
    throw new Error("TODO");
}
function contactCircleVsCircle(
    collider1: Readonly<CircleCollider>,
    collider2: Readonly<CircleCollider>,
    result: Contact
): void {
    const center1 = collider1.center;
    const center2 = collider2.center;
    const radius1 = collider1.radius;
    const radius2 = collider2.radius;
    const distance = subV2(center1, center2);
    const distanceLength = lengthV2(distance);
    if (distanceLength < add(radius1, radius2)) {
        result.isIntersecting = true;
        const penetration = sub(add(radius1, radius2), distanceLength);
        result.penetration = penetration;
        divV2(distance, distanceLength, result.normal);
        result.normalizedTime = unit(1);
    } else {
        result.isIntersecting = false;
    }
}
function updatePosition(context: Readonly<UpdateContext>) {
    for (const { velocity, center, friction } of colliders) {
        // 空気抵抗
        mulV2(velocity, friction, velocity);
        if (isNaN(withoutUnit(velocity[0]))) {
            velocity[0] = unit(0, meterParSeconds);
        }
        if (isNaN(withoutUnit(velocity[1]))) {
            velocity[1] = unit(0, meterParSeconds);
        }
        // 移動
        addV2(center, mulV2(context.frameTimeSpan, velocity), center);
    }
}

function fontSizeAtElement(element: Element) {
    return unit(
        Number(getComputedStyle(element).fontSize.match(/(\d+)px/)?.[1]),
        px
    );
}
function toCssPosition(x: numberWith<meter>) {
    return Math.round(withoutUnit<px>(div(x, meterParPx))) + "px";
}
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
interface PhysicalAnimator {
    chasingTargetElement: Element | undefined;
    stop(): void;
    start(): void;
}
