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
${[...resolved.aliases.entries()].map(([name, alias]) => `const ${name} = [${alias.map((fn) => resolver.gen(name, fn)).join(", ")}];`).join("\n")}

/**
 * definitions
 */
${[...resolved.defs.entries()]
    .map(
        ([name, def]) => `\
const ${name} = ((${def.dependencies.map(([dep]) => `retrieve$${dep}`).join(", ")}) => {
    ${def.dependencies.map(([dep]) => `let cached$${dep};\nconst ${dep} = () => cached$${dep} ?? (cached$${dep} = retrieve$${dep}());`).join("\n")}

    return ${def.js};
})(${def.dependencies.map(([dep]) => `() => ${dep}`).join(", ")});
`
    )
    .join("\n")}
/**
 * models
 */
${[...resolved.models.entries()]
    .map(
        ([name, model]) => `\
export const is${isSnakeCase(name) ? "_" : ""}${name} = ((${model.dependencies.map(([dep]) => `retrieve$${dep}`).join(", ")}) => {
    ${model.dependencies.map(([dep]) => `let cached$${dep};\nconst ${dep} = () => cached$${dep} ?? (cached$${dep} = retrieve$${dep}());`).join("\n")}

    return ${model.js};
})(${model.dependencies.map(([dep]) => `() => ${dep}`).join(", ")});
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
