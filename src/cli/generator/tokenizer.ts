export namespace Tokenizer {
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

export class Tokenizer {
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
                    expect: ["NEWLINE", "WHITESPACE", "CLOSING_PARENTHESES", "COMMA"],
                },
                {
                    type: "STRING",
                    regex: /^("(?:[^"]|(?<=\\)")*"|'(?:[^']|(?<=\\)')*')/,
                    expect: ["NEWLINE", "WHITESPACE", "CLOSING_PARENTHESES", "COMMA"],
                },
                {
                    type: "BOOLEAN",
                    regex: /^(true|false)/,
                    expect: ["NEWLINE", "WHITESPACE", "CLOSING_PARENTHESES", "COMMA"],
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
