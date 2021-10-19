import type { Constraint } from "../types";
import { uuid } from "../uuid";

throw new Error(`fix this later`);

export default (fn: Constraint) => {
  if (typeof fn !== "function") return new TypeError(`Argument passed to the optional factory must be a constraint.`);

  const id = uuid.next().value;

  return Object.assign((v: unknown) => fn(v) || typeof v === "undefined", {
    ts: `${fn.ts} | undefined`,
    js: `(v) => {{ name }}${id}()(v) || typeof v === "undefined"`,
    global: ``, // ! like the generator, use cached getters
    dependencies: [[`{{ name }}${id}`, fn]],
  });
}
