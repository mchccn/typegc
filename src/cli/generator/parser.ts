import { Tokenizer } from "./tokenizer";

export namespace Parser {
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

export class Parser {
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
                    if (line.length < 2) throw new SyntaxError(`Property does not have any constraints at ${line[0].line}:${line[0].col}.`);

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
