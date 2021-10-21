import type { Constraint } from "../types";
import { uuid } from "../uuid";

export default (fn: Constraint) => {
    if (typeof fn !== "function") return new TypeError(`Argument passed to the optional factory must be a constraint.`);

    const id = uuid.next().value;

    return Object.assign((v: unknown) => (fn as Constraint)(v) || typeof v === "undefined", {
        ts: `${(fn as Constraint).ts} | undefined`,
        js: `(v) => {{ name }}${id}()(v) || typeof v === "undefined"`,
        global: ``, // ! like the generator, use cached getters
        dependencies: [[`{{ name }}${id}`, fn]],
    });
};
