import {
    add,
    dimensionless,
    div,
    mul,
    numberWith,
    sub,
    UnitKind,
    sqrt,
    MulU,
} from "./units";

export type vector2<u extends UnitKind> = [x: numberWith<u>, y: numberWith<u>];
export function vector2<u extends UnitKind>(
    x: numberWith<u>,
    y: numberWith<u>
): vector2<u> {
    return [x, y];
}
export function subV2<u extends UnitKind>(
    x1: vector2<u>,
    x2: vector2<u>
): vector2<u> {
    return [sub(x1[0], x2[0]), sub(x1[1], x2[1])];
}
export function addV2<u extends UnitKind>(
    x1: vector2<u>,
    x2: vector2<u>
): vector2<u> {
    return [add(x1[0], x2[0]), add(x1[1], x2[1])];
}
export function mulV2<u1 extends UnitKind, u2 extends UnitKind>(
    x1: vector2<u1> | numberWith<u1>,
    x2: vector2<u2> | numberWith<u2>
): vector2<MulU<u1, u2>> {
    if (Array.isArray(x1)) {
        if (Array.isArray(x2)) {
            return [mul(x1[0], x2[0]), mul(x1[1], x2[1])];
        } else {
            return [mul(x1[0], x2), mul(x1[1], x2)];
        }
    } else {
        if (Array.isArray(x2)) {
            return [mul(x1, x2[0]), mul(x1, x2[1])];
        } else {
            return [mul(x1, x2), mul(x1, x2)];
        }
    }
}

export function normalizeV2<u extends UnitKind>(
    x: vector2<u>
): vector2<dimensionless> {
    const length = sqrt(add(mul(x[0], x[0]), mul(x[1], x[1])));
    return [div(x[0], length), div(x[1], length)];
}
export function distance<u extends UnitKind>(
    p1: vector2<u>,
    p2: vector2<u>
): numberWith<u> {
    const dx = sub(p1[0], p2[0]);
    const dy = sub(p1[1], p2[1]);
    return sqrt(add(mul(dx, dx), mul(dy, dy)));
}
