import { readdir } from "fs/promises";
import { join } from "path";
import { isSnakeCase } from "../utils/isSnakeCase";
import type { Parser } from "./parser";
import type { Tokenizer } from "./tokenizer";
import type { Constraint, Factory } from "./types";
import { uuid } from "./uuid";

export class Resolver {
    public static loaded = false;

    public static async load() {
        const files = (await readdir(join(__dirname, "functions"))).filter((file) => !file.endsWith(".d.ts"));

        const functions = (await Promise.all(files.map((file) => import(join(__dirname, "functions", file)).then((file) => file.default as Factory)))).map(
            (fn) => Object.assign(fn, { isFactory: true })
        );

        functions.forEach((fn, i) => {
            Resolver.builtins.factories.set(files[i].split(".")[0], fn);
        });

        return (this.loaded = true);
    }

    private structs = [...this.source.map((struct) => ({ ...struct }))];

    public static readonly builtins = {
        factories: new Map<string, Factory>(),
        primitives: new Map<string, Constraint>(
            [
                ["string", (v: any) => typeof v === "string"],
                ["number", (v: any) => typeof v === "number"],
                ["boolean", (v: any) => typeof v === "boolean"],
                ["bigint", (v: any) => typeof v === "bigint"],
                ["symbol", (v: any) => typeof v === "symbol"],
            ].map(([key, value]) => [key, Object.assign(value, { ts: key, js: value.toString(), global: `` })] as [string, Constraint])
        ),
    };

    private readonly resolved = {
        config: new Map<string, string | number | boolean>(),
        aliases: new Map<string, Constraint[]>([
            ...[...Resolver.builtins.primitives].map(([key, constraint]) => [key, [constraint]] as [string, Constraint[]]),
        ]),
        defs: new Map<string, Constraint & { properties: [string, string][] }>(),
        models: new Map<string, Constraint & { properties: [string, string][] }>(),
        globals: ``,
    };

    public gen(name: string, fn: Constraint) {
        const templates = [["name", name]];

        if (fn.global) this.resolved.globals += "\n" + templates.reduce((str, [name, value]) => str.replaceAll(`{{ ${name} }}`, value), fn.global);

        return "(" + templates.reduce((str, [name, value]) => str.replaceAll(`{{ ${name} }}`, value), fn.js) + ")" + `/* ${fn.ts} */`;
    }

    public constructor(public readonly source: Parser.Struct[]) {}

    public *[Symbol.iterator]() {
        yield* Object.values(this.resolved);
    }

    public get [Symbol.toStringTag]() {
        return "Resolver";
    }

    private next() {
        const struct = this.structs.shift()!;

        if (struct.type === "CONFIG") {
            return void struct.body.forEach(([option, value]) => {
                if (option.type !== "IDENTIFIER") throw new SyntaxError(`Incorrect configuration syntax at ${option.line}:${option.col}.`);

                if (!["NUMBER", "STRING", "BOOLEAN"].includes(value.type))
                    throw new SyntaxError(`Incorrect configuration syntax at ${option.line}:${option.col}.`);

                this.resolved.config.set(option.value, Resolver.primitivify(value));
            });
        }

        if (struct.type === "ALIAS") {
            if (this.exists(struct.name)) throw new ReferenceError(`Cannot redeclare identifier '${struct.name}'.`);

            if (!struct.body.length) throw new SyntaxError(`Alias '${struct.name}' has an empty body.`);

            const body = [...struct.body];

            const constraints = [] as Constraint[];

            const dependencies = new Map<string, Constraint[]>();

            while (body.length) {
                const token = body.shift()!;

                if (token.type === "IDENTIFIER") {
                    const [binded, deps] = this.identifier(token, body);

                    deps.forEach(([key, dep]) => (!dependencies.has(key) ? dependencies.set(key, dep) : void 0));

                    constraints.push(...binded);
                }
            }

            return void this.resolved.aliases.set(struct.name, [
                Object.assign(constraints[0], {
                    dependencies: [...dependencies.entries()].filter(
                        ([key]) => !Resolver.builtins.factories.has(key) && !Resolver.builtins.primitives.has(key)
                    ),
                }),
                ...constraints.slice(1),
            ]);
        }

        if (struct.type === "DEFINE") {
            if (this.exists(struct.name)) throw new ReferenceError(`Cannot redeclare identifier '${struct.name}'.`);

            const constraints = [] as Constraint[];

            const properties = [] as [string, string][];

            const dependencies = new Map<string, Constraint[]>();

            struct.body.forEach(([prop, ...tokens]) => {
                const resolved = [] as Constraint[];

                const body = [...tokens];

                const propdeps = new Map<string, Constraint[]>();

                while (body.length) {
                    const token = body.shift()!;

                    if (token.type === "IDENTIFIER") {
                        const [binded, deps] = this.identifier(token, body);

                        deps.forEach(([key, dep]) => (!propdeps.has(key) ? propdeps.set(key, dep) : void 0));

                        if (Resolver.isalias(binded))
                            resolved.push(
                                Object.assign(
                                    (v: any) =>
                                        binded.every((fn) => {
                                            const e = fn(v);

                                            if (e instanceof Error) throw e;

                                            return e;
                                        }),
                                    {
                                        ts: [...new Set(binded.flatMap((fn) => fn.ts.split(" | ")))].join(" | "),
                                        js: `(v) => ${token.value}().every((fn) => fn(v))`,
                                        global: ``,
                                        dependencies: deps,
                                    }
                                )
                            );
                        else if (Resolver.isstruct(binded[0]))
                            resolved.push(
                                Object.assign(
                                    (v: any) =>
                                        binded.every((fn) => {
                                            const e = fn(v);

                                            if (e instanceof Error) throw e;

                                            return e;
                                        }),
                                    {
                                        ts: token.value,
                                        js: this.resolved.defs.has(token.value) ? `${token.value}` : `is${isSnakeCase(token.value) ? "_" : ""}${token.value}`,
                                        global: ``,
                                        dependencies: deps,
                                    }
                                )
                            );
                        else resolved.push(...binded);
                    }
                }

                const id = uuid.next().value;

                constraints.push(
                    Object.assign(
                        (v: any) =>
                            resolved.every((fn) => {
                                const e = fn(v[prop.value]);

                                if (e instanceof Error) throw e;

                                return e;
                            }),
                        {
                            ts: [...new Set(resolved.flatMap((fn) => fn.ts.split(" | ")))].join(" | "),
                            js: `(v) => array$${struct.name}$${prop.value}${id}.every((fn) => fn(v["${prop.value.replaceAll('"', '\\"')}"]))`,
                            global: `const array$${struct.name}$${prop.value}${id} = ((${[...propdeps.entries()]
                                .map(([dep]) => `retrieve$${dep}`)
                                .join(", ")}) => { ${[...propdeps.entries()]
                                .map(([dep]) => `let cached$${dep}; const ${dep} = () => cached$${dep} ?? (cached$${dep} = retrieve$${dep}());`)
                                .join(" ")} return [${resolved.map((fn) => this.gen(`${struct.name}$${prop.value}`, fn)).join(", ")}] })(${[
                                ...propdeps.entries(),
                            ]
                                .map(([dep]) => `() => ${dep}`)
                                .join(", ")});`,
                            dependencies: [...propdeps.entries()],
                        }
                    )
                );

                [...propdeps.entries()].forEach(([key, dep]) => (!dependencies.has(key) ? dependencies.set(key, dep) : void 0));

                properties.push([prop.value, [...new Set(resolved.flatMap((fn) => fn.ts.split(" | ")))].join(" | ")]);
            });

            this.resolved.globals += `\nconst mainArray$${struct.name} = [${constraints.map((fn) => this.gen(struct.name, fn)).join(", ")}];`;

            constraints.forEach((fn) => this.gen(struct.name, fn));

            return void this.resolved.defs.set(
                struct.name,
                Object.assign(
                    (v: any) =>
                        constraints.every((fn) => {
                            const e = fn(v);

                            if (e instanceof Error) throw e;

                            return e;
                        }),
                    {
                        properties,
                        ts: struct.name,
                        js: `(v) => mainArray$${struct.name}.every((fn) => fn(v))`,
                        global: ``,
                        dependencies: [...dependencies.entries()],
                    }
                )
            );
        }

        if (struct.type === "MODEL") {
            if (this.exists(struct.name)) throw new ReferenceError(`Cannot redeclare identifier '${struct.name}'.`);

            const constraints = [] as Constraint[];

            const properties = [] as [string, string][];

            const dependencies = new Map<string, Constraint[]>();

            struct.body.forEach(([prop, ...tokens]) => {
                const resolved = [] as Constraint[];

                const body = [...tokens];

                const propdeps = new Map<string, Constraint[]>();

                while (body.length) {
                    const token = body.shift()!;

                    if (token.type === "IDENTIFIER") {
                        const [binded, deps] = this.identifier(token, body);

                        deps.forEach(([key, dep]) => (!propdeps.has(key) ? propdeps.set(key, dep) : void 0));

                        if (Resolver.isalias(binded))
                            resolved.push(
                                Object.assign(
                                    (v: any) =>
                                        binded.every((fn) => {
                                            const e = fn(v);

                                            if (e instanceof Error) throw e;

                                            return e;
                                        }),
                                    {
                                        ts: [...new Set(binded.flatMap((fn) => fn.ts.split(" | ")))].join(" | "),
                                        js: `(v) => ${token.value}().every((fn) => fn(v))`,
                                        global: ``,
                                        dependencies: deps,
                                    }
                                )
                            );
                        else if (Resolver.isstruct(binded[0]))
                            resolved.push(
                                Object.assign(
                                    (v: any) =>
                                        binded.every((fn) => {
                                            const e = fn(v);

                                            if (e instanceof Error) throw e;

                                            return e;
                                        }),
                                    {
                                        ts: token.value,
                                        js: this.resolved.defs.has(token.value) ? `${token.value}` : `is${isSnakeCase(token.value) ? "_" : ""}${token.value}`,
                                        global: ``,
                                        dependencies: deps,
                                    }
                                )
                            );
                        else resolved.push(...binded);
                    }
                }

                const id = uuid.next().value;

                constraints.push(
                    Object.assign(
                        (v: any) =>
                            resolved.every((fn) => {
                                const e = fn(v[prop.value]);

                                if (e instanceof Error) throw e;

                                return e;
                            }),
                        {
                            ts: [...new Set(resolved.flatMap((fn) => fn.ts.split(" | ")))].join(" | "),
                            js: `(v) => array$${struct.name}$${prop.value}${id}.every((fn) => fn(v["${prop.value.replaceAll('"', '\\"')}"]))`,
                            global: `const array$${struct.name}$${prop.value}${id} = ((${[...propdeps.entries()]
                                .map(([dep]) => `retrieve$${dep}`)
                                .join(", ")}) => { ${[...propdeps.entries()]
                                .map(([dep]) => `let cached$${dep}; const ${dep} = () => cached$${dep} ?? (cached$${dep} = retrieve$${dep}());`)
                                .join(" ")} return [${resolved.map((fn) => this.gen(`${struct.name}$${prop.value}`, fn)).join(", ")}] })(${[
                                ...propdeps.entries(),
                            ]
                                .map(([dep]) => `() => ${dep}`)
                                .join(", ")});`,

                            dependencies: [...propdeps.entries()],
                        }
                    )
                );

                [...propdeps.entries()].forEach(([key, dep]) => (!dependencies.has(key) ? dependencies.set(key, dep) : void 0));

                properties.push([prop.value, [...new Set(resolved.flatMap((fn) => fn.ts.split(" | ")))].join(" | ")]);
            });

            this.resolved.globals += `\nconst mainArray$${struct.name} = [${constraints.map((fn) => this.gen(struct.name, fn)).join(", ")}];`;

            constraints.forEach((fn) => this.gen(struct.name, fn));

            return void this.resolved.models.set(
                struct.name,
                Object.assign(
                    (v: any) =>
                        constraints.every((fn) => {
                            const e = fn(v);

                            if (e instanceof Error) throw e;

                            return e;
                        }),
                    {
                        properties,
                        ts: struct.name,
                        js: `(v) => mainArray$${struct.name}.every((fn) => fn(v))`,
                        global: ``,
                        dependencies: [...dependencies.entries()],
                    }
                )
            );
        }

        throw new Error(`Struct type not handled properly: '${struct.type}'.`);
    }

    public resolve() {
        while (this.structs.length) this.next();

        return this.resolved;
    }

    public get result() {
        return this.resolved;
    }

    private identifier(token: Tokenizer.Token, body: Tokenizer.Token[]): [Constraint[], [string, Constraint[]][]] {
        const binded = this.binded(token);

        const dependencies = new Map<string, Constraint[]>();

        if (this.resolved.aliases.has(token.value) || this.resolved.defs.has(token.value) || this.resolved.models.has(token.value))
            dependencies.set(token.value, [binded as Constraint | Constraint[]].flat());

        if (body[0]?.type === "OPENING_PARENTHESES") {
            if (!Resolver.isfactory(binded)) throw new ReferenceError(`Identifier is not a factory at ${token.line}:${token.col}.`);

            const tokens = [] as Tokenizer.Token[];

            let current = body.shift();

            while (current?.type !== "CLOSING_PARENTHESES") {
                if (!current) throw new SyntaxError(`Unclosed parentheses at ${tokens[tokens.length - 1].line}:${tokens[tokens.length - 1].col}.`);

                tokens.push(current);

                current = body.shift();
            }

            tokens.splice(0, 1);

            const args = tokens.flatMap((token, i): (string | number | boolean | Constraint)[] => {
                if (i % 2) {
                    if (token.type !== "COMMA") throw new SyntaxError(`Expected comma at ${token.line}:${token.col}, instead got '${token.value}'.`);

                    return [];
                }

                if (token.type === "IDENTIFIER") {
                    const [res, deps] = this.identifier(token, body);

                    if (res.length > 1) throw new ReferenceError(`Cannot pass '${token.value}' as a parameter at ${token.line}:${token.col}.`);

                    deps.forEach(([key, dep]) => (!dependencies.has(key) ? dependencies.set(key, dep) : void 0));

                    return [res[0]];
                }

                return [Resolver.primitivify(token)];
            });

            return [
                [binded(...args)],
                [...dependencies.entries()].filter(([key]) => !Resolver.builtins.factories.has(key) && !Resolver.builtins.primitives.has(key)),
            ];
        } else if (body[0]?.type !== "IDENTIFIER" && body[0]) throw new SyntaxError(`Unexpected token '${token.value}' at ${token.line}:${token.col}.`);
        else {
            if (Resolver.isfactory(binded)) throw new ReferenceError(`Factory wasn't called at ${token.line}:${token.col}.`);

            if (Array.isArray(binded)) return [Object.assign(binded, { isAlias: true }), [...dependencies.entries()]];

            return [[binded], [...dependencies.entries()].filter(([key]) => !Resolver.builtins.factories.has(key) && !Resolver.builtins.primitives.has(key))];
        }
    }

    private binded(token: Tokenizer.Token) {
        const binded =
            this.resolved.aliases.get(token.value) ??
            this.resolved.defs.get(token.value) ??
            this.resolved.models.get(token.value) ??
            Resolver.builtins.primitives.get(token.value) ??
            Resolver.builtins.factories.get(token.value);

        if (!binded) throw new ReferenceError(`Identifier '${token.value}' does not exist at ${token.line}:${token.col}.`);

        if (this.resolved.defs.has(token.value) || this.resolved.models.has(token.value)) return Object.assign(binded, { isStruct: true });

        return binded;
    }

    private exists(id: string) {
        return !!(
            this.resolved.aliases.get(id) ??
            this.resolved.defs.get(id) ??
            this.resolved.models.get(id) ??
            Resolver.builtins.primitives.get(id) ??
            Resolver.builtins.factories.get(id)
        );
    }

    private static primitivify(token: Tokenizer.Token) {
        if (token.type === "BOOLEAN") return token.value === "true";

        if (token.type === "NUMBER") return Number(token.value);

        if (token.type === "STRING") return token.value.slice(1, -1);

        throw new TypeError(`Cannot convert '${token.value}' to a primitive.`);
    }

    private static isfactory(v: any): v is Factory {
        return typeof v === "function" && v.isFactory === true;
    }

    private static isalias(v: any): v is Constraint[] & { isAlias: true } {
        return Array.isArray(v) && v.every((fn) => typeof fn === "function") && (v as any).isAlias === true;
    }

    private static isstruct(v: any): v is Constraint & { isStruct: true } {
        return typeof v === "function" && v.isStruct === true;
    }
}
