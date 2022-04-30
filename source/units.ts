// -------------- 汎用 --------------
export type Id<T> = (x: T) => T;
export function id<T>(x: T) {
    return x;
}
type kind<kind, t extends kind> = t;
type unreachable = never;
type equals<T, S> = [T] extends [S] ? ([S] extends [T] ? true : false) : false;
function assert<_T extends true>() {}

// -------------- 自然数 --------------
type NatKind = never[];
type _0n = [];
type _1n = [never];
type AddN<n1 extends NatKind, n2 extends NatKind> = [...n1, ...n2];
type SubN<n1 extends NatKind, n2 extends NatKind> = n1 extends [
    ...n2,
    ...infer n3
]
    ? n3 extends NatKind
        ? kind<NatKind, n3>
        : never
    : never;

// -------------- 整数 --------------
type SignKind = "+" | "-";
type IntKind = [SignKind, NatKind];
type _0 = ["+", []];
type _1 = ["+", [never]];
type _2 = ["+", [never, never]];
type _3 = ["+", [never, never, never]];
type _m1 = ["-", [never]];
type _m2 = ["-", [never, never]];
type _m3 = ["-", [never, never, never]];
type NormalizeZ<z extends IntKind> = kind<IntKind, z[1] extends _0n ? _0 : z>;
type MakeNatural<sign extends SignKind, abs extends NatKind> = NormalizeZ<
    [sign, abs]
>;
type SubNatToInt<n1 extends NatKind, n2 extends NatKind> = SubN<
    n1,
    n2
> extends never
    ? MakeNatural<"-", SubN<n2, n1>>
    : MakeNatural<"+", SubN<n1, n2>>;
type Add<z1 extends IntKind, z2 extends IntKind> = z1[0] extends "+"
    ? z2[0] extends "+"
        ? MakeNatural<"+", AddN<z1[1], z2[1]>>
        : SubNatToInt<z1[1], z2[1]>
    : z2[0] extends "+"
    ? SubNatToInt<z2[1], z1[1]>
    : MakeNatural<"-", AddN<z1[1], z2[1]>>;
type Sub<z1 extends IntKind, z2 extends IntKind> = z1[0] extends "+"
    ? z2[0] extends "+"
        ? SubNatToInt<z1[1], z2[1]>
        : MakeNatural<"+", AddN<z1[1], z2[1]>>
    : z2[0] extends "+"
    ? MakeNatural<"-", AddN<z1[1], z2[1]>>
    : SubNatToInt<z2[1], z1[1]>;
{
    assert<equals<Add<_1, _2>, _3>>();
    assert<equals<Add<_2, _1>, _3>>();
    assert<equals<Add<_1, _m2>, _m1>>();
    assert<equals<Add<_m2, _1>, _m1>>();
    assert<equals<Add<_m2, _m1>, _m3>>();
    assert<equals<Add<_m1, _m2>, _m3>>();

    assert<equals<Add<_1, _1>, _2>>();
    assert<equals<Add<_1, _m1>, _0>>();
    assert<equals<Add<_m1, _1>, _0>>();
    assert<equals<Add<_m1, _m1>, _m2>>();

    assert<equals<Sub<_1, _2>, _m1>>();
    assert<equals<Sub<_2, _1>, _1>>();
    assert<equals<Sub<_1, _m2>, _3>>();
    assert<equals<Sub<_m2, _1>, _m3>>();
    assert<equals<Sub<_m2, _m1>, _m1>>();
    assert<equals<Sub<_m1, _m2>, _1>>();

    assert<equals<Sub<_1, _1>, _0>>();
    assert<equals<Sub<_1, _m1>, _2>>();
    assert<equals<Sub<_m1, _1>, _m2>>();
    assert<equals<Sub<_m1, _m1>, _0>>();
}

// -------------- 単位 --------------
export type UnitKind = {
    [name: string]: IntKind;
};
// eslint-disable-next-line @typescript-eslint/ban-types
export type dimensionless = {};
export type Unit<name extends string, dimension extends IntKind = _1> = {
    [n in name]: dimension;
};
type NormalizeU<u extends UnitKind> = {
    [p in keyof u as u[p] extends _0 ? never : p]: u[p];
};
export type MulU<u1 extends UnitKind, u2 extends UnitKind> = NormalizeU<{
    [name in keyof u1 | keyof u2]: name extends keyof u1
        ? name extends keyof u2
            ? Add<u1[name], u2[name]>
            : u1[name]
        : name extends keyof u2
        ? u2[name]
        : _0;
}>;
export type DivU<u1 extends UnitKind, u2 extends UnitKind> = NormalizeU<{
    [name in keyof u1 | keyof u2]: name extends keyof u1
        ? name extends keyof u2
            ? Sub<u1[name], u2[name]>
            : u1[name]
        : name extends keyof u2
        ? Sub<_0, u2[name]>
        : _0;
}>;
{
    type a = { a: _1 };
    type b = { b: _1 };
    type ab = { a: _1; b: _1 };
    /** `a²` */
    type a2 = { a: _2 };
    /** `a²b⁻²` */
    type a2_bm2 = { a: _2; b: _m2 };
    /** `b²c²` */
    type b2_c2 = { b: _2; c: _2 };
    /** `a²c²` */
    type a2_c2 = { a: _2; c: _2 };

    assert<equals<MulU<a, b>, ab>>();
    assert<equals<MulU<b, a>, ab>>();
    assert<equals<MulU<a, a>, a2>>();
    assert<equals<MulU<a2_bm2, b2_c2>, a2_c2>>();
}
// -------------- 単位付き数値 --------------
const privateNumberWithSymbol = Symbol("privateNumberWith");
export interface numberWith<unit extends UnitKind> {
    [privateNumberWithSymbol]: typeof privateNumberWithSymbol & unit;
}
export function withUnit<u extends UnitKind>(
    value: number,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _unit: Id<u>
): numberWith<u>;
export function withUnit(value: number): numberWith<dimensionless>;
export function withUnit<u extends UnitKind>(
    value: number,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _unit?: Id<u>
): numberWith<u> {
    return value as unknown as numberWith<u>;
}
export function withoutUnit<u extends UnitKind>(value: numberWith<u>) {
    return value as unknown as number;
}

// -------------- SI 単位系 --------------
export type seconds = { s: _1 };
export const seconds: Id<seconds> = id;
export type meter = { m: _1 };
export const meter: Id<meter> = id;
export type kilogram = { kg: _1 };
export const kilogram: Id<kilogram> = id;

// -------------- 標準 API 拡張 --------------
export function add<u extends UnitKind>(n1: numberWith<u>, n2: numberWith<u>) {
    return withUnit<u>(withoutUnit(n1) + withoutUnit(n2), id);
}
export function sub<u extends UnitKind>(n1: numberWith<u>, n2: numberWith<u>) {
    return withUnit<u>(withoutUnit(n1) - withoutUnit(n2), id);
}
export function mul<u1 extends UnitKind, u2 extends UnitKind>(
    n1: numberWith<u1>,
    n2: numberWith<u2>
) {
    return withUnit<MulU<u1, u2>>(withoutUnit(n1) * withoutUnit(n2), id);
}
export function div<u1 extends UnitKind, u2 extends UnitKind>(
    n1: numberWith<u1>,
    n2: numberWith<u2>
) {
    return withUnit<DivU<u1, u2>>(withoutUnit(n1) / withoutUnit(n2), id);
}
export function neg<u extends UnitKind>(n: numberWith<u>) {
    return withUnit<u>(-withoutUnit(n), id);
}
export function lt<u extends UnitKind>(n1: numberWith<u>, n2: numberWith<u>) {
    return withoutUnit(n1) < withoutUnit(n2);
}
export function sqrt<u extends UnitKind>(x: numberWith<MulU<u, u>>) {
    return withUnit<u>(Math.sqrt(withoutUnit(x)), id);
}
export function max<u extends UnitKind>(x1: numberWith<u>, x2: numberWith<u>) {
    return withUnit<u>(Math.max(withoutUnit(x1), withoutUnit(x2)), id);
}
export function min<u extends UnitKind>(x1: numberWith<u>, x2: numberWith<u>) {
    return withUnit<u>(Math.min(withoutUnit(x1), withoutUnit(x2)), id);
}
