namespace Tokenizer {
    export type Token = {
        type:
            | "NUMBER"
            | "STRING"
            | "BOOLEAN"
            | "CONFIG"
            | "ALIAS"
            | "DEFINE"
            | "MODEL"
            | "IDENTIFIER"
            | "WHITESPACE"
            | "NEWLINE"
            | "OPENING_BRACKET"
            | "CLOSING_BRACKET"
            | "OPENING_PARENTHESES"
            | "CLOSING_PARENTHESES"
            | "COMMA";
        value: string;
        line: number;
        col: number;
    };

    export type Pattern = {
        type: Tokenizer.Token["type"];
        regex: RegExp;
        expect: Tokenizer.Token["type"][];
    };
}

namespace Parser {
    export type Struct =
        | {
              type: "DEFINE" | "MODEL";
              name: string;
              body: Tokenizer.Token[][];
          }
        | {
              type: "ALIAS";
              name: string;
              body: Tokenizer.Token[];
          }
        | {
              type: "CONFIG";
              body: Tokenizer.Token[][];
          };
}

type Constraint = (value: any) => boolean | Error;
type Factory = ((...args: any[]) => Constraint) & { isFactory: true };
type ConstraintOrFactory = Constraint | Factory;

class Tokenizer {
    private tokens = [] as Tokenizer.Token[];

    private input = this.source;

    private line = 1;
    private col = 1;

    private inblock = false;

    private static readonly tokens: Map<string, Tokenizer.Pattern> = new Map(
        (
            [
                {
                    type: "NEWLINE",
                    regex: /^(\n+)/,
                    expect: ["CONFIG", "ALIAS", "DEFINE", "MODEL", "IDENTIFIER", "CLOSING_BRACKET", "WHITESPACE"],
                },
                {
                    type: "WHITESPACE",
                    regex: /^([ \t\r\f\v]+)/,
                    expect: [
                        "COMMA",
                        "NUMBER",
                        "STRING",
                        "BOOLEAN",
                        "CONFIG",
                        "ALIAS",
                        "DEFINE",
                        "MODEL",
                        "IDENTIFIER",
                        "NEWLINE",
                        "CLOSING_BRACKET",
                        "OPENING_BRACKET",
                    ],
                },
                {
                    type: "CONFIG",
                    regex: /^(config)/,
                    expect: ["NEWLINE", "WHITESPACE", "OPENING_BRACKET"],
                },
                {
                    type: "ALIAS",
                    regex: /^(alias)/,
                    expect: ["WHITESPACE"],
                },
                {
                    type: "DEFINE",
                    regex: /^(define)/,
                    expect: ["WHITESPACE"],
                },
                {
                    type: "MODEL",
                    regex: /^(model)/,
                    expect: ["WHITESPACE"],
                },
                {
                    type: "IDENTIFIER",
                    regex: /^([_$a-zA-Z\xA0-\uFFFF][_$a-zA-Z0-9\xA0-\uFFFF]*)/,
                    expect: ["COMMA", "NEWLINE", "WHITESPACE", "OPENING_PARENTHESES"],
                },
                {
                    type: "NUMBER",
                    regex: /^([+-]?\d+(?:\.?\d*)?|\.\d+)/,
                    expect: ["WHITESPACE", "CLOSING_PARENTHESES", "COMMA"],
                },
                {
                    type: "STRING",
                    regex: /^("(?:[^"]|(?<=\\)")*"|'(?:[^']|(?<=\\)')*')/,
                    expect: ["WHITESPACE", "CLOSING_PARENTHESES", "COMMA"],
                },
                {
                    type: "BOOLEAN",
                    regex: /^(true|false)/,
                    expect: ["WHITESPACE", "CLOSING_PARENTHESES", "COMMA"],
                },
                {
                    type: "OPENING_BRACKET",
                    regex: /^(\{)/,
                    expect: ["NEWLINE", "WHITESPACE"],
                },
                {
                    type: "CLOSING_BRACKET",
                    regex: /^(\})/,
                    expect: ["NEWLINE", "WHITESPACE"],
                },
                {
                    type: "OPENING_PARENTHESES",
                    regex: /^(\()/,
                    expect: ["IDENTIFIER", "NUMBER", "STRING", "BOOLEAN", "WHITESPACE"],
                },
                {
                    type: "CLOSING_PARENTHESES",
                    regex: /^(\))/,
                    expect: ["IDENTIFIER", "WHITESPACE", "NEWLINE"],
                },
                {
                    type: "COMMA",
                    regex: /^(,)/,
                    expect: ["IDENTIFIER", "NUMBER", "STRING", "BOOLEAN", "WHITESPACE"],
                },
            ] as Tokenizer.Pattern[]
        ).map((pattern) => [pattern.type, pattern])
    );

    private static readonly starting = ["CONFIG", "ALIAS", "DEFINE", "MODEL", "NEWLINE", "WHITESPACE"].map((key) => Tokenizer.tokens.get(key)!);

    public constructor(public readonly source: string) {}

    public *[Symbol.iterator]() {
        yield* this.tokens;
    }

    public get [Symbol.toStringTag]() {
        return "Tokenizer";
    }

    private next() {
        for (const pattern of Tokenizer.patterns) {
            const value = pattern.regex.exec(this.input)?.[0];

            if (value) {
                if (this.inblock && ["CONFIG", "ALIAS", "DEFINE", "MODEL"].includes(pattern.type)) continue;

                if (!this.expecting.some(({ type }) => type === pattern.type))
                    throw new SyntaxError(`Unexpected token '${value}' at ${this.line}:${this.col}.`);

                const { type } = pattern;

                this.input = this.input.slice(value.length);

                const { line, col } = this;

                if (value.includes("\n")) {
                    this.line += value.split("\n").length - 1;
                    this.col = 1;
                } else this.col += value.length;

                if (pattern.type === "OPENING_BRACKET") this.inblock = true;
                if (pattern.type === "CLOSING_BRACKET") this.inblock = false;

                return { type, value, line, col };
            }
        }

        throw new SyntaxError(`Unexpected symbol '${this.input[0]}' at ${this.line}:${this.col}.`);
    }

    public tokenize() {
        while (!this.done) {
            this.tokens.push(this.next());
        }

        return this.tokens;
    }

    public get result() {
        return this.tokens;
    }

    private get expecting() {
        if (this.tokens.length) return Tokenizer.tokens.get(this.tokens[this.tokens.length - 1].type)!.expect.map((key) => Tokenizer.tokens.get(key)!);

        return Tokenizer.starting;
    }

    private get done() {
        return !this.input.length;
    }

    private static get patterns() {
        return [...Tokenizer.tokens.values()];
    }
}

class Parser {
    private tokens = this.source.filter((token) => token.type !== "WHITESPACE");

    private readonly structs = [] as Parser.Struct[];

    public constructor(public readonly source: Tokenizer.Token[]) {
        {
            let bracketdepth = 0;
            let parensdepth = 0;

            this.source.forEach((token) => {
                if (token.type === "OPENING_BRACKET") bracketdepth++;
                if (token.type === "CLOSING_BRACKET") bracketdepth--;
                if (token.type === "OPENING_PARENTHESES") parensdepth++;
                if (token.type === "CLOSING_PARENTHESES") parensdepth--;
            });

            if (bracketdepth !== 0) {
                if (Math.abs(bracketdepth) === 1) throw new SyntaxError(`Mismatched brackets.`);

                throw new SyntaxError(`Too many nested brackets.`);
            }

            if (parensdepth !== 0) {
                if (Math.abs(parensdepth) === 1) throw new SyntaxError(`Mismatched parentheses.`);

                throw new SyntaxError(`Too many nested parentheses.`);
            }
        }
    }

    public *[Symbol.iterator]() {
        yield* this.structs;
    }

    public get [Symbol.toStringTag]() {
        return "Parser";
    }

    private next() {
        const token = this.tokens.shift()!;

        if (token.type === "CONFIG") {
            const body = [] as Tokenizer.Token[][];

            let line = [] as Tokenizer.Token[];

            let current = this.tokens.shift();

            while (current?.type !== "CLOSING_BRACKET") {
                if (!current) throw new SyntaxError(`Unexpected end of input.`);

                if (current.type === "NEWLINE") {
                    if (body.length && line[0].type !== "OPENING_BRACKET") {
                        if (line.length > 2) throw new SyntaxError(`Incorrect configuration syntax at ${current.line}:${current.col}.`);

                        if (["true", "false"].includes(line[1].value)) line[1].type = "BOOLEAN";

                        if (!Number.isNaN(Number(line[1].value))) line[1].type = "NUMBER";

                        if ((line[1].value.startsWith('"') && line[1].value.endsWith('"')) || (line[1].value.startsWith("'") && line[1].value.endsWith("'")))
                            line[1].type = "STRING";
                    }

                    body.push(line);

                    line = [];
                } else line.push(current);

                current = this.tokens.shift();
            }

            body.splice(0, 1);

            return this.structs.push({ type: "CONFIG", body });
        }

        if (token.type === "ALIAS") {
            const body = [] as Tokenizer.Token[];

            let current = this.tokens.shift();

            while (current?.type !== "NEWLINE") {
                if (!current) throw new SyntaxError(`Unexpected end of input.`);

                body.push(current);

                current = this.tokens.shift();
            }

            return this.structs.push({
                type: "ALIAS",
                name: body[0].value,
                body: body.slice(1),
            });
        }

        if (token.type === "DEFINE") {
            const body = [] as Tokenizer.Token[][];

            let line = [] as Tokenizer.Token[];

            let current = this.tokens.shift();

            while (current?.type !== "CLOSING_BRACKET") {
                if (!current) throw new SyntaxError(`Unexpected end of input.`);

                if (current.type === "NEWLINE") {
                    body.push(line);

                    line = [];
                } else line.push(current);

                current = this.tokens.shift();
            }

            return this.structs.push({
                type: "DEFINE",
                name: body[0][0].value,
                body: body.slice(1),
            });
        }

        if (token.type === "MODEL") {
            const body = [] as Tokenizer.Token[][];

            let line = [] as Tokenizer.Token[];

            let current = this.tokens.shift();

            while (current?.type !== "CLOSING_BRACKET") {
                if (!current) throw new SyntaxError(`Unexpected end of input.`);

                if (current.type === "NEWLINE") {
                    if (line.length < 2) throw new SyntaxError(`Property does not have any constraints at ${line[0].line}:${line[0].col}.`);

                    body.push(line);

                    line = [];
                } else line.push(current);

                current = this.tokens.shift();
            }

            return this.structs.push({
                type: "MODEL",
                name: body[0][0].value,
                body: body.slice(1),
            });
        }

        if (token.type !== "NEWLINE") throw new Error(`Token type not handled properly: '${token.type}'.`);

        return;
    }

    public parse() {
        while (this.tokens.length) this.next();

        return this.structs;
    }

    public get result() {
        return this.structs;
    }
}

class Resolver {
    private structs = this.source;

    public static readonly builtins = {
        factories: new Map<string, Factory>(
            [
                [
                    "range",
                    (start: number, stop?: number, step?: number) => {
                        return (v: number | string) => {
                            if (start && stop && step) {
                                if (typeof v === "string") return new RangeError(`String values cannot use the step parameter for the range function.`);

                                // finish this and other built-in factories
                            }

                            return true;
                        };
                    },
                ],
            ].map(([key, value]) => [key, Object.assign(value, { isFactory: true })] as [string, Factory])
        ),
        primitives: new Map<string, Constraint>([
            ["string", (v: any) => typeof v === "string"],
            ["number", (v: any) => typeof v === "number"],
            ["boolean", (v: any) => typeof v === "boolean"],
        ]),
    };

    private readonly resolved = {
        config: new Map<string, string | number | boolean>(),
        aliases: new Map<string, Constraint[]>([
            ...[...Resolver.builtins.primitives].map(([key, constraint]) => [key, [constraint]] as [string, Constraint[]]),
        ]),
        defs: new Map<string, Constraint>(),
        models: new Map<string, Constraint>(),
    };

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
            return struct.body.forEach(([option, value]) => {
                if (option.type !== "IDENTIFIER") throw new SyntaxError(`Incorrect configuration syntax at ${option.line}:${option.col}.`);

                if (!["NUMBER", "STRING", "BOOLEAN"].includes(value.type))
                    throw new SyntaxError(`Incorrect configuration syntax at ${option.line}:${option.col}.`);

                this.resolved.config.set(option.value, Resolver.primitivify(value));
            });
        }

        if (struct.type === "ALIAS") {
            if (this.resolved.aliases.has(struct.name)) throw new ReferenceError(`Alias '${struct.name}' already exists.`);

            if (!struct.body.length) throw new SyntaxError(`Alias '${struct.name}' has an empty body.`);

            const body = [...struct.body];

            const constraints = [] as Constraint[];

            while (body.length) {
                const token = body.shift()!;

                if (token.type === "IDENTIFIER") constraints.push(...this.identifier(token, body));
            }

            this.resolved.aliases.set(struct.name, constraints);
        }

        if (struct.type === "DEFINE") {
            console.log(struct.body);

            const constraints = [] as Constraint[];

            struct.body.forEach(([prop, ...tokens]) => {
                const resolved = [] as Constraint[];
            });
        }

        if (struct.type === "MODEL") {
        }
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

        if (!Resolver.isfactory(binded)) throw new ReferenceError(`Identifier is not a factory at ${token.line}:${token.col}.`);

        if (body[0].type === "OPENING_PARENTHESES") {
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
        } else if (body[0].type !== "IDENTIFIER") throw new SyntaxError(`Unexpected token '${token.value}' at ${token.line}:${token.col}.`);
        else {
            const binded = this.binded(token);

            if (Resolver.isfactory(binded)) throw new ReferenceError(`Factory wasn't called at ${token.line}:${token.col}.`);

            return [binded].flat();
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

        return binded;
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
}

class Generator {}

/**
 * ## Name currently undecided
 *
 * ### How the compiler works
 *
 * - Tokenizer tokenizes schema into tokens
 * - Parser parse tokens into structures
 * - Resolver converts structures into an IR
 * - Generator takes IR and outputs JavaScript and type declarations.
 *
 * **Between each step, plugins will be executed.**
 */

const schema = `
config {
  strict true
}

alias ErrorCode range(400, 599)

define ErrorObject {
  message string
  stack   string
}

model APIError {
  status   number      ErrorCode
  message  string
  endpoint string      match("(/[^/])+")
  error    ErrorObject
}
`;

console.clear();

const tokens = new Tokenizer(schema).tokenize();

const structs = new Parser(tokens).parse();

const resolved = new Resolver(structs).resolve();

for (const key in resolved) console.log(key, resolved[key as keyof typeof resolved]);
