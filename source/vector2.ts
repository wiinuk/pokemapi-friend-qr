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
    withUnit,
    id,
    DivU,
} from "./units";

export type vector2<u extends UnitKind> = [x: numberWith<u>, y: numberWith<u>];
export function vector2<u extends UnitKind>(
    x: numberWith<u>,
    y: numberWith<u>
): vector2<u> {
    return [x, y];
}
export function subV2<u extends UnitKind>(
    x1: Readonly<vector2<u>>,
    x2: Readonly<vector2<u>>,
    result: vector2<u> = [withUnit(0, id), withUnit(0, id)]
): vector2<u> {
    result[0] = sub(x1[0], x2[0]);
    result[1] = sub(x1[1], x2[1]);
    return result;
}
export function addV2<u extends UnitKind>(
    x1: Readonly<vector2<u>>,
    x2: Readonly<vector2<u>>,
    result: vector2<u> = [withUnit(0, id), withUnit(0, id)]
) {
    result[0] = add(x1[0], x2[0]);
    result[1] = add(x1[1], x2[1]);
    return result;
}
function isNumberWithUnit<u extends UnitKind>(x: unknown): x is numberWith<u> {
    return typeof x === "number";
}

export function mulV2<u1 extends UnitKind, u2 extends UnitKind>(
    x1: Readonly<vector2<u1>> | numberWith<u1>,
    x2: Readonly<vector2<u2>> | numberWith<u2>,
    result: vector2<MulU<u1, u2>> = [withUnit(0, id), withUnit(0, id)]
): vector2<MulU<u1, u2>> {
    if (!isNumberWithUnit(x1)) {
        if (!isNumberWithUnit(x2)) {
            result[0] = mul(x1[0], x2[0]);
            result[1] = mul(x1[1], x2[1]);
        } else {
            result[0] = mul(x1[0], x2);
            result[1] = mul(x1[1], x2);
        }
    } else {
        if (!isNumberWithUnit(x2)) {
            result[0] = mul(x1, x2[0]);
            result[1] = mul(x1, x2[1]);
        } else {
            result[0] = mul(x1, x2);
            result[1] = mul(x1, x2);
        }
    }
    return result;
}
export function divV2<u1 extends UnitKind, u2 extends UnitKind>(
    x1: Readonly<vector2<u1>> | numberWith<u1>,
    x2: Readonly<vector2<u2>> | numberWith<u2>,
    result: vector2<DivU<u1, u2>> = [withUnit(0, id), withUnit(0, id)]
): vector2<DivU<u1, u2>> {
    if (!isNumberWithUnit(x1)) {
        if (!isNumberWithUnit(x2)) {
            result[0] = div(x1[0], x2[0]);
            result[1] = div(x1[1], x2[1]);
        } else {
            result[0] = div(x1[0], x2);
            result[1] = div(x1[1], x2);
        }
    } else {
        if (!isNumberWithUnit(x2)) {
            result[0] = div(x1, x2[0]);
            result[1] = div(x1, x2[1]);
        } else {
            result[0] = div(x1, x2);
            result[1] = div(x1, x2);
        }
    }
    return result;
}

export function normalizeV2<u extends UnitKind>(
    x: Readonly<vector2<u>>,
    result: vector2<dimensionless> = [withUnit(0), withUnit(0)]
) {
    const length = sqrt(add(mul(x[0], x[0]), mul(x[1], x[1])));
    result[0] = div(x[0], length);
    result[1] = div(x[1], length);
    return result;
}
export function distance<u extends UnitKind>(
    p1: Readonly<vector2<u>>,
    p2: Readonly<vector2<u>>
): numberWith<u> {
    const dx = sub(p1[0], p2[0]);
    const dy = sub(p1[1], p2[1]);
    return sqrt(add(mul(dx, dx), mul(dy, dy)));
}
export function lengthV2<u extends UnitKind>(
    x: Readonly<vector2<u>>
): numberWith<u> {
    return sqrt(add(mul(x[0], x[0]), mul(x[1], x[1])));
}
export function dotV2<u1 extends UnitKind, u2 extends UnitKind>(
    x1: Readonly<vector2<u1>>,
    x2: Readonly<vector2<u2>>
): numberWith<MulU<u1, u2>> {
    return add(mul(x1[0], x2[0]), mul(x1[1], x2[1]));
}
