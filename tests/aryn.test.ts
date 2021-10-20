import { expect } from "chai";
import { Generator } from "../src/cli/generator";
import { Parser } from "../src/cli/generator/parser";
import { Resolver } from "../src/cli/generator/resolver";
import { Tokenizer } from "../src/cli/generator/tokenizer";
import { TEST_TYPES } from "./shared.test";

/**
 * Inspired by Aryn : https://discord.com/channels/172018499005317120/765973358038220870/897482471598346310
 *
 * This project would've never happened if you hadn't asked. Thanks!
 *
 * Checkout his GitHub at https://github.com/arynxd
 */

describe(`${TEST_TYPES.BEHAVIOUR} Aryn's original request`, () => {
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
      endpoint string      match("(/[^/]*)+")
      error    ErrorObject
    }
    `;

    before(() => Resolver.load());

    it("tokenizes correctly", (done) => {
        expect(new Tokenizer(schema).tokenize().filter((token) => token.type !== "COMMENT")).to.deep.equal([
            { type: "NEWLINE", value: "\n", line: 1, col: 1 },
            { type: "WHITESPACE", value: "    ", line: 2, col: 1 },
            { type: "CONFIG", value: "config", line: 2, col: 5 },
            { type: "WHITESPACE", value: " ", line: 2, col: 11 },
            { type: "OPENING_BRACKET", value: "{", line: 2, col: 12 },
            { type: "NEWLINE", value: "\n", line: 2, col: 13 },
            { type: "WHITESPACE", value: "      ", line: 3, col: 1 },
            { type: "IDENTIFIER", value: "strict", line: 3, col: 7 },
            { type: "WHITESPACE", value: " ", line: 3, col: 13 },
            { type: "IDENTIFIER", value: "true", line: 3, col: 14 },
            { type: "NEWLINE", value: "\n", line: 3, col: 18 },
            { type: "WHITESPACE", value: "    ", line: 4, col: 1 },
            { type: "CLOSING_BRACKET", value: "}", line: 4, col: 5 },
            { type: "NEWLINE", value: "\n", line: 4, col: 6 },
            { type: "WHITESPACE", value: "    ", line: 5, col: 1 },
            { type: "NEWLINE", value: "\n", line: 5, col: 5 },
            { type: "WHITESPACE", value: "    ", line: 6, col: 1 },
            { type: "ALIAS", value: "alias", line: 6, col: 5 },
            { type: "WHITESPACE", value: " ", line: 6, col: 10 },
            { type: "IDENTIFIER", value: "ErrorCode", line: 6, col: 11 },
            { type: "WHITESPACE", value: " ", line: 6, col: 20 },
            { type: "IDENTIFIER", value: "range", line: 6, col: 21 },
            { type: "OPENING_PARENTHESES", value: "(", line: 6, col: 26 },
            { type: "NUMBER", value: "400", line: 6, col: 27 },
            { type: "COMMA", value: ",", line: 6, col: 30 },
            { type: "WHITESPACE", value: " ", line: 6, col: 31 },
            { type: "NUMBER", value: "599", line: 6, col: 32 },
            { type: "CLOSING_PARENTHESES", value: ")", line: 6, col: 35 },
            { type: "NEWLINE", value: "\n", line: 6, col: 36 },
            { type: "WHITESPACE", value: "    ", line: 7, col: 1 },
            { type: "NEWLINE", value: "\n", line: 7, col: 5 },
            { type: "WHITESPACE", value: "    ", line: 8, col: 1 },
            { type: "DEFINE", value: "define", line: 8, col: 5 },
            { type: "WHITESPACE", value: " ", line: 8, col: 11 },
            { type: "IDENTIFIER", value: "ErrorObject", line: 8, col: 12 },
            { type: "WHITESPACE", value: " ", line: 8, col: 23 },
            { type: "OPENING_BRACKET", value: "{", line: 8, col: 24 },
            { type: "NEWLINE", value: "\n", line: 8, col: 25 },
            { type: "WHITESPACE", value: "      ", line: 9, col: 1 },
            { type: "IDENTIFIER", value: "message", line: 9, col: 7 },
            { type: "WHITESPACE", value: " ", line: 9, col: 14 },
            { type: "IDENTIFIER", value: "string", line: 9, col: 15 },
            { type: "NEWLINE", value: "\n", line: 9, col: 21 },
            { type: "WHITESPACE", value: "      ", line: 10, col: 1 },
            { type: "IDENTIFIER", value: "stack", line: 10, col: 7 },
            { type: "WHITESPACE", value: "   ", line: 10, col: 12 },
            { type: "IDENTIFIER", value: "string", line: 10, col: 15 },
            { type: "NEWLINE", value: "\n", line: 10, col: 21 },
            { type: "WHITESPACE", value: "    ", line: 11, col: 1 },
            { type: "CLOSING_BRACKET", value: "}", line: 11, col: 5 },
            { type: "NEWLINE", value: "\n", line: 11, col: 6 },
            { type: "WHITESPACE", value: "    ", line: 12, col: 1 },
            { type: "NEWLINE", value: "\n", line: 12, col: 5 },
            { type: "WHITESPACE", value: "    ", line: 13, col: 1 },
            { type: "MODEL", value: "model", line: 13, col: 5 },
            { type: "WHITESPACE", value: " ", line: 13, col: 10 },
            { type: "IDENTIFIER", value: "APIError", line: 13, col: 11 },
            { type: "WHITESPACE", value: " ", line: 13, col: 19 },
            { type: "OPENING_BRACKET", value: "{", line: 13, col: 20 },
            { type: "NEWLINE", value: "\n", line: 13, col: 21 },
            { type: "WHITESPACE", value: "      ", line: 14, col: 1 },
            { type: "IDENTIFIER", value: "status", line: 14, col: 7 },
            { type: "WHITESPACE", value: "   ", line: 14, col: 13 },
            { type: "IDENTIFIER", value: "number", line: 14, col: 16 },
            { type: "WHITESPACE", value: "      ", line: 14, col: 22 },
            { type: "IDENTIFIER", value: "ErrorCode", line: 14, col: 28 },
            { type: "NEWLINE", value: "\n", line: 14, col: 37 },
            { type: "WHITESPACE", value: "      ", line: 15, col: 1 },
            { type: "IDENTIFIER", value: "message", line: 15, col: 7 },
            { type: "WHITESPACE", value: "  ", line: 15, col: 14 },
            { type: "IDENTIFIER", value: "string", line: 15, col: 16 },
            { type: "NEWLINE", value: "\n", line: 15, col: 22 },
            { type: "WHITESPACE", value: "      ", line: 16, col: 1 },
            { type: "IDENTIFIER", value: "endpoint", line: 16, col: 7 },
            { type: "WHITESPACE", value: " ", line: 16, col: 15 },
            { type: "IDENTIFIER", value: "string", line: 16, col: 16 },
            { type: "WHITESPACE", value: "      ", line: 16, col: 22 },
            { type: "IDENTIFIER", value: "match", line: 16, col: 28 },
            { type: "OPENING_PARENTHESES", value: "(", line: 16, col: 33 },
            { type: "STRING", value: '"(/[^/]*)+"', line: 16, col: 34 },
            { type: "CLOSING_PARENTHESES", value: ")", line: 16, col: 45 },
            { type: "NEWLINE", value: "\n", line: 16, col: 46 },
            { type: "WHITESPACE", value: "      ", line: 17, col: 1 },
            { type: "IDENTIFIER", value: "error", line: 17, col: 7 },
            { type: "WHITESPACE", value: "    ", line: 17, col: 12 },
            { type: "IDENTIFIER", value: "ErrorObject", line: 17, col: 16 },
            { type: "NEWLINE", value: "\n", line: 17, col: 27 },
            { type: "WHITESPACE", value: "    ", line: 18, col: 1 },
            { type: "CLOSING_BRACKET", value: "}", line: 18, col: 5 },
            { type: "NEWLINE", value: "\n", line: 18, col: 6 },
            { type: "WHITESPACE", value: "    ", line: 19, col: 1 },
        ]);

        return done();
    });

    it("parses correctly", (done) => {
        expect(new Parser(new Tokenizer(schema).tokenize()).parse()).to.deep.equal([
            {
                type: "CONFIG",
                body: [
                    [
                        { type: "IDENTIFIER", value: "strict", line: 3, col: 7 },
                        { type: "BOOLEAN", value: "true", line: 3, col: 14 },
                    ],
                ],
                comments: "",
            },
            {
                type: "ALIAS",
                name: "ErrorCode",
                body: [
                    { type: "IDENTIFIER", value: "range", line: 6, col: 21 },
                    { type: "OPENING_PARENTHESES", value: "(", line: 6, col: 26 },
                    { type: "NUMBER", value: "400", line: 6, col: 27 },
                    { type: "COMMA", value: ",", line: 6, col: 30 },
                    { type: "NUMBER", value: "599", line: 6, col: 32 },
                    { type: "CLOSING_PARENTHESES", value: ")", line: 6, col: 35 },
                ],
                comments: "",
            },
            {
                type: "DEFINE",
                name: "ErrorObject",
                body: [
                    [
                        { type: "IDENTIFIER", value: "message", line: 9, col: 7 },
                        { type: "IDENTIFIER", value: "string", line: 9, col: 15 },
                    ],
                    [
                        { type: "IDENTIFIER", value: "stack", line: 10, col: 7 },
                        { type: "IDENTIFIER", value: "string", line: 10, col: 15 },
                    ],
                ],
                comments: "",
            },
            {
                type: "MODEL",
                name: "APIError",
                body: [
                    [
                        { type: "IDENTIFIER", value: "status", line: 14, col: 7 },
                        { type: "IDENTIFIER", value: "number", line: 14, col: 16 },
                        { type: "IDENTIFIER", value: "ErrorCode", line: 14, col: 28 },
                    ],
                    [
                        { type: "IDENTIFIER", value: "message", line: 15, col: 7 },
                        { type: "IDENTIFIER", value: "string", line: 15, col: 16 },
                    ],
                    [
                        { type: "IDENTIFIER", value: "endpoint", line: 16, col: 7 },
                        { type: "IDENTIFIER", value: "string", line: 16, col: 16 },
                        { type: "IDENTIFIER", value: "match", line: 16, col: 28 },
                        { type: "OPENING_PARENTHESES", value: "(", line: 16, col: 33 },
                        { type: "STRING", value: '"(/[^/]*)+"', line: 16, col: 34 },
                        { type: "CLOSING_PARENTHESES", value: ")", line: 16, col: 45 },
                    ],
                    [
                        { type: "IDENTIFIER", value: "error", line: 17, col: 7 },
                        { type: "IDENTIFIER", value: "ErrorObject", line: 17, col: 16 },
                    ],
                ],
                comments: "",
            },
        ]);

        return done();
    });

    it("resolves correctly", (done) => {
        const resolved = new Resolver(new Parser(new Tokenizer(schema).tokenize()).parse()).resolve();

        expect(resolved.config).to.deep.equal(new Map([["strict", true]]));
        expect(resolved.aliases.get("ErrorCode")).to.have.a.property("isAlias", true);
        expect(Object.fromEntries(Object.entries(resolved.aliases.get("ErrorCode")![0]).filter(([key]) => !["dependencies"].includes(key)))).to.deep.equal({
            comments: "",
            ts: "string | number",
            js: '(v) => {\nif (599 <= 400) return new RangeError(`Stop parameter must be greater than the start parameter in the range factory.`);\n\nif (typeof v === "string") return v.length >= 400 && v.length <= 599;\n\nreturn v >= 400 && v <= 599;\n}',
            global: "",
        });
        expect(Object.fromEntries(Object.entries(resolved.defs.get("ErrorObject")!).filter(([key]) => !["dependencies"].includes(key)))).to.deep.equal({
            comments: "",
            properties: [
                ["message", "string"],
                ["stack", "string"],
            ],
            ts: "ErrorObject",
            js: "(v) => mainArray$ErrorObject.every((fn) => fn(v))",
            global: "",
            isStruct: true,
        });
        expect(Object.fromEntries(Object.entries(resolved.models.get("APIError")!).filter(([key]) => !["dependencies"].includes(key)))).to.deep.equal({
            comments: "",
            properties: [
                ["status", "number | string"],
                ["message", "string"],
                ["endpoint", "string"],
                ["error", "ErrorObject"],
            ],
            ts: "APIError",
            js: resolved.models.get("APIError")!.js,
            global: "",
        });
        expect(resolved.globals).to.equal(
            `\nconst mainArray$ErrorObject = [((v) => array$ErrorObject$message0.every((fn) => fn(v["message"])))/* string */, ((v) => array$ErrorObject$stack1.every((fn) => fn(v["stack"])))/* string */];\nconst array$ErrorObject$message0 = ((retrieve$string) => { let cached$string; const string = () => cached$string ?? (cached$string = retrieve$string()); return [((v) => string().every((fn) => fn(v)))/* string */] })(() => string);\nconst array$ErrorObject$stack1 = ((retrieve$string) => { let cached$string; const string = () => cached$string ?? (cached$string = retrieve$string()); return [((v) => string().every((fn) => fn(v)))/* string */] })(() => string);\nconst APIError$endpoint4 = new RegExp("(/[^/]*)+");\nconst mainArray$APIError = [((v) => array$APIError$status2.every((fn) => fn(v["status"])))/* number | string */, ((v) => array$APIError$message3.every((fn) => fn(v["message"])))/* string */, ((v) => array$APIError$endpoint5.every((fn) => fn(v["endpoint"])))/* string */, ((v) => array$APIError$error6.every((fn) => fn(v["error"])))/* ErrorObject */];\nconst array$APIError$status2 = ((retrieve$number, retrieve$ErrorCode) => { let cached$number; const number = () => cached$number ?? (cached$number = retrieve$number()); let cached$ErrorCode; const ErrorCode = () => cached$ErrorCode ?? (cached$ErrorCode = retrieve$ErrorCode()); return [((v) => number().every((fn) => fn(v)))/* number */, ((v) => ErrorCode().every((fn) => fn(v)))/* string | number */] })(() => number, () => ErrorCode);\nconst array$APIError$message3 = ((retrieve$string) => { let cached$string; const string = () => cached$string ?? (cached$string = retrieve$string()); return [((v) => string().every((fn) => fn(v)))/* string */] })(() => string);\nconst array$APIError$endpoint5 = ((retrieve$string) => { let cached$string; const string = () => cached$string ?? (cached$string = retrieve$string()); return [((v) => string().every((fn) => fn(v)))/* string */, ((v) => APIError$endpoint4.test(v))/* string */] })(() => string);\nconst array$APIError$error6 = ((retrieve$ErrorObject) => { let cached$ErrorObject; const ErrorObject = () => cached$ErrorObject ?? (cached$ErrorObject = retrieve$ErrorObject()); return [(ErrorObject)/* ErrorObject */] })(() => ErrorObject);`
        );

        return done();
    });

    it("generates correctly", (done) => {
        expect(new Generator(schema).generate()[1]).to.equal(
            `/**\n * typegc - Type Guard Compiler\n * \n * version 1.0.0\n * \n * AUTO-GENERATED FILE DO NOT EDIT DIRECTLY\n */\n\n/**\n * config\n * {\n *     "strict": true\n * }\n */\n\n/**\n * type aliases\n */\ndeclare var _: never;\n\n\n\n\n\ntype ErrorCode = string | number;\n\n/**\n * interfaces\n */\n declare var _: never;\ninterface ErrorObject {\n    message: string;\n    stack: string;\n}\n\n/**\n * exported interfaces\n */\ndeclare var _: never;\nexport interface APIError {\n    status: number | string;\n    message: string;\n    endpoint: string;\n    error: ErrorObject;\n}\n\n/**\n * type guards\n */\ndeclare var _: never;\nexport declare const isAPIError: (v: unknown) => v is APIError;\n\n`
        );

        return done();
    });

    it("checks correctly at runtime", (done) => {
        const resolved = new Resolver(new Parser(new Tokenizer(schema).tokenize()).parse()).resolve();

        expect(resolved.models.get("APIError")!({})).to.be.false;
        expect(
            resolved.models.get("APIError")!({
                status: "400",
                message: "a message",
                endpoint: "/",
                error: {
                    message: "a message",
                    stack: "a stack",
                },
            })
        ).to.be.false;
        expect(
            resolved.models.get("APIError")!({
                status: 399,
                message: "a message",
                endpoint: "/",
                error: {
                    message: "a message",
                    stack: "a stack",
                },
            })
        ).to.be.false;
        expect(
            resolved.models.get("APIError")!({
                status: 400,
                message: "a message",
                endpoint: "not an endpoint",
                error: {
                    message: "a message",
                    stack: "a stack",
                },
            })
        ).to.be.false;
        expect(
            resolved.models.get("APIError")!({
                status: 400,
                message: "a message",
                endpoint: "/",
                error: {
                    message: "a message",
                    stack: "a stack",
                },
            })
        ).to.be.true;

        return done();
    });

    it("checks correctly at compile time", (done) => {
        const isAPIError = eval(new Generator(schema).generate()[0].replace(/export const isAPIError = /, ""));

        expect(isAPIError({})).to.be.false;
        expect(
            isAPIError({
                status: "400",
                message: "a message",
                endpoint: "/",
                error: {
                    message: "a message",
                    stack: "a stack",
                },
            })
        ).to.be.false;
        expect(
            isAPIError({
                status: 399,
                message: "a message",
                endpoint: "/",
                error: {
                    message: "a message",
                    stack: "a stack",
                },
            })
        ).to.be.false;
        expect(
            isAPIError({
                status: 400,
                message: "a message",
                endpoint: "not an endpoint",
                error: {
                    message: "a message",
                    stack: "a stack",
                },
            })
        ).to.be.false;
        expect(
            isAPIError({
                status: 400,
                message: "a message",
                endpoint: "/",
                error: {
                    message: "a message",
                    stack: "a stack",
                },
            })
        ).to.be.true;

        return done();
    });
});
