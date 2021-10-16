import { Parser } from "./parser";
import { Resolver } from "./resolver";
import { Tokenizer } from "./tokenizer";
import { isSnakeCase } from "./utils";

export class Generator {
    constructor(public readonly schema: string) {}

    public generate() {
        const tokens = new Tokenizer(this.schema).tokenize();

        const structs = new Parser(tokens).parse();

        const resolver = new Resolver(structs);

        const resolved = resolver.resolve();

        return [
            `
/**
 * typegc - Type Guard Compiler
 * 
 * version 1.0.0
 * 
 * AUTO-GENERATED FILE DO NOT EDIT DIRECTLY
 */

/**
 * config
${JSON.stringify(Object.fromEntries([...resolved.config.entries()]), undefined, 4)
    .split("\n")
    .map((line) => ` * ${line}`)
    .join("\n")}
 */

const wrap = (e) => {
    if (e instanceof Error) throw e;

    return e;
};

/**
 * globals
 */${[...new Set(resolved.globals.split("\n"))].join("\n")}

/**
 * aliases
 */
${[...resolved.aliases.entries()]
    .map(([name, alias]) => `var alias$${name} = [${alias.map((fn) => resolver.gen(`alias$${name}`, fn)).join(", ")}];`)
    .join("\n")}

/**
 * definitions
 */
${[...resolved.defs.entries()]
    .map(
        ([name, def]) => `\
var def$${name} = ${def.js};
`
    )
    .join("\n")}
/**
 * models
 */
${[...resolved.models.entries()]
    .map(
        ([name, model]) => `\
export var is${isSnakeCase(name) ? "_" : ""}${name} = ${model.js};
`
    )
    .join("\n")}
`,
            `
/**
 * typegc - Type Guard Compiler
 * 
 * version 1.0.0
 * 
 * AUTO-GENERATED FILE DO NOT EDIT DIRECTLY
 */

/**
 * config
${JSON.stringify(Object.fromEntries([...resolved.config.entries()]), undefined, 4)
    .split("\n")
    .map((line) => ` * ${line}`)
    .join("\n")}
 */

/**
 * type aliases
 */
${[...resolved.aliases.entries()]
    .map(
        ([name, alias]) => `\
type ${name} = ${[...new Set(alias.flatMap((fn) => fn.ts.split(" | ")))].join(" | ")};\
`
    )
    .join("\n")}

/**
 * interfaces
 */
${[...resolved.defs.entries()]
    .map(
        ([name, model]) => `\
interface ${name} {
${model.properties.map(([prop, type]) => `    ${prop}: ${type};`).join("\n")}
}`
    )
    .join("\n")}

/**
 * exported interfaces
 */
${[...resolved.models.entries()]
    .map(
        ([name, model]) => `\
export interface ${name} {
${model.properties.map(([prop, type]) => `    ${prop}: ${type};`).join("\n")}
}`
    )
    .join("\n")}

/**
 * type guards
 */
${[...resolved.models.entries()]
    .map(
        ([name, model]) => `\
export declare const is${isSnakeCase(name) ? "_" : ""}${name}: (v: unknown) => v is ${name};
`
    )
    .join("\n")}
`,
        ] as [js: string, dts: string];
    }
}
