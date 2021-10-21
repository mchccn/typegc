// ! MASSIVE WORK IN PROGRESS

declare class Tokenizer {}
declare class Parser {}
declare class Resolver {}
declare class Generator {}

declare namespace Tokenizer {
    export type Token = {};
}

declare namespace Parser {
    export type Struct = {};
}

declare type Constraint = Function;

export enum TypeGCPluginType {
    TOKENIZER,
    PARSER,
    RESOLVER,
    GENERATOR,
    STDLIB,
    CLI,
}

export interface TypeGCTokenizerPlugin {
    type: TypeGCPluginType.TOKENIZER;
    tokens?: Tokenizer.Token[] | ((tokens: Tokenizer.Token[]) => Tokenizer.Token[]);
    onLoad?: () => unknown;
    onNewTokenizer?: (this: Tokenizer) => unknown;
    onNextToken?: (this: Tokenizer, input: string) => unknown;
    onTokenMatch?: (this: Tokenizer, token: string) => boolean;
    onCorrectMatch?: (this: Tokenizer, token: string) => string;
}

export interface TypeGCParserPlugin {
    type: TypeGCPluginType.PARSER;
    onLoad?: () => unknown;
    onNewParser?: (this: Parser) => unknown;
    onParserError?: (this: Parser) => unknown;
    onNextStruct?: (this: Parser, token: Tokenizer.Token, rest: Tokenizer.Token[]) => unknown;
    onUnhandledToken?: (this: Parser, token: Tokenizer.Token) => unknown;
}

export interface TypeGCResolverPlugin {
    type: TypeGCPluginType.RESOLVER;
    onLoad?: () => unknown;
    onNewResolver?: (this: Resolver) => unknown;
    onJsGeneration?: (this: Resolver, name: string, fn: Constraint) => string;
    onNextResolution?: (this: Resolver, struct: Parser.Struct) => unknown;
    onUnhandledStruct?: (this: Resolver, struct: Parser.Struct) => unknown;
}

export interface TypeGCGeneratorPlugin {
    type: TypeGCPluginType.GENERATOR;
    onLoad?: () => unknown;
    inspectTokens?: (this: Generator, tokens: Tokenizer.Token[]) => Tokenizer.Token[];
    inspectStructs?: (this: Generator, structs: Parser.Struct[]) => Parser.Struct[];
    inspectResolved?: (this: Generator, resolved: { /* insert type here */}) => { /* insert type here */ };
    preprocessGlobals?: (this: Generator, globals: string) => string;
    postprocessGlobals?: (this: Generator, globals: string) => string;
    preprocessAliases?: (this: Generator, aliases: { /* insert type here */ }) => { /* insert type here */ };
    postprocessAliases?: (this: Generator, aliases: { /* insert type here */ }) => string;
    preprocessDefinitions?: (this: Generator, defs: { /* insert type here */ }) => { /* insert type here */ };
    postprocessDefinitions?: (this: Generator, defs: { /* insert type here */ }) => string;
    preprocessModels?: (this: Generator, models: { /* insert type here */ }) => { /* insert type here */ };
    postprocessModels?: (this: Generator, models: { /* insert type here */ }) => string;
    generateTypesForGlobals?: (this: Generator, globals: string) => string;
    generateTypesForAliases?: (this: Generator, aliases: { /* insert type here */ }) => string;
    generateTypesForDefinitions?: (this: Generator, defs: { /* insert type here */ }) => string;
    generateTypesForModels?: (this: Generator, models: { /* insert type here */ }) => string;
}

export interface TypeGCStandardLibraryPlugin {
    type: TypeGCPluginType.STDLIB;
    factories: ((...args: any[]) => Constraint)[] | (() => ((...args: any[]) => Constraint)[]);
    onLoad?: () => unknown;
}

export interface TypeGCCLIPlugin {
    type: TypeGCPluginType.CLI;
    commands?: Record<string, { /* insert type here */ }> | Map<string, { /* insert type here */ }>;
    onLoad?: () => unknown;
    onCommandExec?: (command: string, args: { /* insert type here */ }) => unknown;
    onCommandFail?: (command: string, args: { /* insert type here */ }) => unknown;
    onUnknownCommand?: (args: { /* insert type here */ }) => unknown;
}

export type TypeGCPlugin = TypeGCTokenizerPlugin;
