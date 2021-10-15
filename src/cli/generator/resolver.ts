import { Parser } from "./parser";
import { Tokenizer } from "./tokenizer";
import { Factory, Constraint } from "./types";
import { isSnakeCase } from "./utils";

export class Resolver {
    private structs = this.source;

    public static readonly builtins = {
        factories: new Map<string, Factory>(
            [
                [
                    "range",
                    (start: number, stop?: number, step?: number) => {
                        return Object.assign(
                            (v: number | string) => {
                                if (typeof start === "number" && typeof stop === "number" && typeof step === "number") {
                                    if (typeof v === "string") return new RangeError(`String values cannot use the step parameter for the range factory.`);

                                    if (stop <= start) return new RangeError(`Stop parameter must be greater than the start parameter in the range factory.`);

                                    if (step <= 0) return new RangeError(`Step parameter for the range factory must be positive.`);

                                    return v >= start && v <= stop && (v - start) % step === 0;
                                }

                                if (typeof start === "number" && typeof stop === "number") {
                                    if (stop <= start) return new RangeError(`Stop parameter must be greater than the start parameter in the range factory.`);

                                    if (typeof v === "string") return v.length >= start && v.length <= stop;

                                    return v >= start && v <= stop;
                                }

                                if (typeof start === "number") {
                                    if (start < 0) {
                                        if (typeof v === "string")
                                            throw new RangeError(`String values cannot use a negative end parameter in the range factory.`);

                                        return v >= start;
                                    }

                                    return typeof v === "string" ? v.length <= start : v <= start && v >= 0;
                                }

                                throw new RangeError(`Expected 1-3 arguments for the range factory, got none.`);
                            },
                            {
                                ts: `string | number`,
                                js:
                                    typeof start === "number" && typeof stop === "number" && typeof step === "number"
                                        ? `(v) => {
    if (typeof v === "string") return new RangeError(\`String values cannot use the step parameter for the range factory.\`);

    if (stop <= start) return new RangeError(\`Stop parameter must be greater than the start parameter in the range factory.\`);

    if (step <= 0) return new RangeError(\`Step parameter for the range factory must be positive.\`);

    return v >= start && v <= stop && ((v - start) % step) === 0;
}`
                                        : typeof start === "number" && typeof stop === "number"
                                        ? `(v) => {
    if (stop <= start) return new RangeError(\`Stop parameter must be greater than the start parameter in the range factory.\`);

    if (typeof v === "string") return v.length >= start && v.length <= stop;

    return v >= start && v <= stop;
}`
                                        : typeof start === "number"
                                        ? `(v) => {
    if (start < 0) {
        if (typeof v === "string") throw new RangeError(\`String values cannot use a negative end parameter in the range factory.\`);

        return v >= start;
    }

    return typeof v === "string" ? v.length <= start : v <= start && v >= 0;
}`
                                        : `() => false`,
                                global: ``,
                            }
                        );
                    },
                ],
                [
                    "match",
                    (pattern: string, flags?: string) => {
                        if (!pattern) return new TypeError(`Pattern provided to the match factory cannot be empty.`);

                        const regex = new RegExp(pattern, flags);

                        const id = Date.now();

                        return Object.assign((v: string) => regex.test(v), {
                            ts: `string`,
                            js: `(v) => {{ name }}${id}.test(v)`,
                            global: `const {{ name }}${id} = new RegExp("${pattern.replaceAll('"', '\\"')}")`,
                        });
                    },
                ],
            ].map(([key, value]) => [key, Object.assign(value, { ts: `string`, js: value.toString(), isFactory: true })] as [string, Factory])
        ),
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

            while (body.length) {
                const token = body.shift()!;

                if (token.type === "IDENTIFIER") constraints.push(...this.identifier(token, body));
            }

            return void this.resolved.aliases.set(struct.name, constraints);
        }

        if (struct.type === "DEFINE") {
            if (this.exists(struct.name)) throw new ReferenceError(`Cannot redeclare identifier '${struct.name}'.`);

            const constraints = [] as Constraint[];

            const properties = [] as [string, string][];

            struct.body.forEach(([prop, ...tokens]) => {
                const resolved = [] as Constraint[];

                const body = [...tokens];

                while (body.length) {
                    const token = body.shift()!;

                    if (token.type === "IDENTIFIER") {
                        const binded = this.identifier(token, body);

                        if (Resolver.isalias(binded))
                            resolved.push(
                                Object.assign(
                                    (v: any) =>
                                        binded.every((fn) => {
                                            const e = fn(v[prop.value]);

                                            if (e instanceof Error) throw e;

                                            return e;
                                        }),
                                    {
                                        ts: [...new Set(binded.flatMap((fn) => fn.ts.split(" | ")))].join(" | "),
                                        js: `(v) => alias$${token.value}.every((fn) => wrap(fn(v)))`,
                                        global: ``,
                                    }
                                )
                            );
                        else if (Resolver.isstruct(binded[0]))
                            resolved.push(
                                Object.assign(
                                    (v: any) =>
                                        binded.every((fn) => {
                                            const e = fn(v[prop.value]);

                                            if (e instanceof Error) throw e;

                                            return e;
                                        }),
                                    {
                                        ts: token.value,
                                        js: this.resolved.defs.has(token.value)
                                            ? `def$${token.value}`
                                            : `is${isSnakeCase(token.value) ? "_" : ""}${token.value}`,
                                        global: ``,
                                    }
                                )
                            );
                        else resolved.push(...binded);
                    }
                }

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
                            js: `(v) => [${resolved
                                .map((fn) => this.gen(`${struct.name}$${prop.value}`, fn))
                                .join(", ")}].every((fn) => wrap(fn(v["${prop.value.replaceAll('"', '\\"')}"])))`,
                            global: ``,
                        }
                    )
                );

                properties.push([prop.value, [...new Set(resolved.flatMap((fn) => fn.ts.split(" | ")))].join(" | ")]);
            });

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
                        js: `(v) => [${constraints.map((fn) => this.gen(struct.name, fn)).join(", ")}].every((fn) => wrap(fn(v)))`,
                        global: ``,
                    }
                )
            );
        }

        if (struct.type === "MODEL") {
            if (this.exists(struct.name)) throw new ReferenceError(`Cannot redeclare identifier '${struct.name}'.`);

            const constraints = [] as Constraint[];

            const properties = [] as [string, string][];

            struct.body.forEach(([prop, ...tokens]) => {
                const resolved = [] as Constraint[];

                const body = [...tokens];

                while (body.length) {
                    const token = body.shift()!;

                    if (token.type === "IDENTIFIER") {
                        const binded = this.identifier(token, body);

                        if (Resolver.isalias(binded))
                            resolved.push(
                                Object.assign(
                                    (v: any) =>
                                        binded.every((fn) => {
                                            const e = fn(v[prop.value]);

                                            if (e instanceof Error) throw e;

                                            return e;
                                        }),
                                    {
                                        ts: [...new Set(binded.flatMap((fn) => fn.ts.split(" | ")))].join(" | "),
                                        js: `(v) => alias$${token.value}.every((fn) => wrap(fn(v)))`,
                                        global: ``,
                                    }
                                )
                            );
                        else if (Resolver.isstruct(binded[0]))
                            resolved.push(
                                Object.assign(
                                    (v: any) =>
                                        binded.every((fn) => {
                                            const e = fn(v[prop.value]);

                                            if (e instanceof Error) throw e;

                                            return e;
                                        }),
                                    {
                                        ts: token.value,
                                        js: this.resolved.defs.has(token.value)
                                            ? `def$${token.value}`
                                            : `is${isSnakeCase(token.value) ? "_" : ""}${token.value}`,
                                        global: ``,
                                    }
                                )
                            );
                        else resolved.push(...binded);
                    }
                }

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
                            js: `(v) => [${resolved
                                .map((fn) => this.gen(`${struct.name}$${prop.value}`, fn))
                                .join(", ")}].every((fn) => wrap(fn(v["${prop.value.replaceAll('"', '\\"')}"])))`,
                            global: ``,
                        }
                    )
                );

                properties.push([prop.value, [...new Set(resolved.flatMap((fn) => fn.ts.split(" | ")))].join(" | ")]);
            });

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
                        js: `(v) => [${constraints.map((fn) => this.gen(struct.name, fn)).join(", ")}].every((fn) => wrap(fn(v)))`,
                        global: ``,
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

    private identifier(token: Tokenizer.Token, body: Tokenizer.Token[]): Constraint[] {
        const binded = this.binded(token);

        if (body[0]?.type === "OPENING_PARENTHESES") {
            if (!Resolver.isfactory(binded)) throw new ReferenceError(`Identifier is not a factory at ${token.line}:${token.col}.`);

            const tokens = [] as Tokenizer.Token[];

            let current = body.shift();

            while (current?.type !== "CLOSING_PARENTHESES") {
                if (!current) throw new SyntaxError(`Unclosed `);

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
                    const res = this.identifier(token, body);

                    if (res.length > 2) throw new ReferenceError(`Cannot pass '${token.value}' as a parameter at ${token.line}:${token.col}.`);

                    return [res[0]];
                }

                return [Resolver.primitivify(token)];
            });

            return [binded(...args)];
        } else if (body[0]?.type !== "IDENTIFIER" && body[0]) throw new SyntaxError(`Unexpected token '${token.value}' at ${token.line}:${token.col}.`);
        else {
            if (Resolver.isfactory(binded)) throw new ReferenceError(`Factory wasn't called at ${token.line}:${token.col}.`);

            if (Array.isArray(binded)) return Object.assign(binded, { isAlias: true });

            return [binded];
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