type Whitespace = " ";

type EatWhitespace<S extends string> = S extends `${Whitespace}${infer Rest}` ? EatWhitespace<Rest> : S;

type TrimEnd<S extends string> = S extends `${infer Rest}${Whitespace}` ? TrimEnd<Rest> : S;

type Trim<S extends string> = TrimEnd<EatWhitespace<S>>;

type Split<S extends string, Sep extends string = "", R extends string[] = []> = S extends `${infer First}${Sep}${infer Rest}` ? Split<Rest, Sep, [...R, First]> : [...R, S];

type Join<A, Sep extends string = "", R extends string = ""> = A extends [infer First, ...infer Rest] ? Join<Rest, Sep, R extends "" ? First : `${R}${Sep}${First & string}`> : R;

type SkipParentheses<S extends string> = Join<RemoveTokensInside<Split<S, ",">>, ",">;

type IntersectAll<A, R = unknown> = A extends [infer First, ...infer Rest] ? IntersectAll<Rest, R & First> : R;

type FilterIncorrect<A, R extends string[] = []> = A extends [infer First, ...infer Rest] ? First extends `${string}${")" | "\""}${string}` ? FilterIncorrect<Rest, R> : FilterIncorrect<Rest, [...R, First & string]> : R;

type BuiltinTypes = {
    string  : string ;
    number  : number ;
    boolean : boolean;
    symbol  : symbol ;
    bigint  : bigint ;
};

type FactoryTypes = {
    "range" : string | number;
    "match" : string         ;
};

type RemoveTokensInside<
    A,
> = A extends []
    ? A
    : A extends [infer First, ...infer ARest]
        ? First extends `${infer _})${infer Rest}`
            ? [Rest, ...ARest]
            : RemoveTokensInside<ARest>
        : A;

type GetDependencies<
    S extends string       ,
    R extends string[] = [],
> = EatWhitespace<S> extends `\n${string}` | ""
    ? R
    : EatWhitespace<S> extends `${infer Identifier}(${infer Rest}`
        ? Identifier extends `${infer First}${Whitespace}${infer Second}`
            ? GetDependencies<SkipParentheses<Rest>, [...R, Trim<First>, Trim<Second>]>
            : GetDependencies<SkipParentheses<Rest>, [...R, Trim<Identifier>]>
        : EatWhitespace<S> extends `${infer Identifier}${Whitespace}${infer Rest}`
            ? GetDependencies<Rest, [...R, Identifier]>
            : S extends `${infer Dep}(${string}`
                ? [...R, Trim<Dep>]
                : [...R, Trim<S>];

type Primitivify<
    S extends string
> = S extends "true"
    ? true
    : S extends "false"
        ? false
        : S extends `${bigint}`
            ? S // Parse string as number
            : S extends `"${infer Quote}"`
                ? Quote
                : S extends `'${infer Quote}'`
                    ? Quote
                    : never
;

type GetIdentifier<
    Id extends string , 
    Aliases extends {},
    Defs    extends {},
    Models  extends {},
> = Id extends keyof BuiltinTypes
    ? BuiltinTypes[Id]
    : Id extends keyof FactoryTypes
        ? FactoryTypes[Id]
        : Id extends keyof Aliases
            ? Aliases[Id]
            : Id extends keyof Defs
                ? Defs[Id]
                : Id extends keyof Models
                    ? Models[Id]
                    : { error: `Identifier '${Id}' is not defined.` }
;

type GetConstraintTypes<
    Ids     extends any[]   ,
    Aliases extends {}      ,
    Defs    extends {}      ,
    Models  extends {}      ,
    R extends unknown[] = [],
> = Ids extends [infer First, ...infer Rest]
    ? GetIdentifier<First & string, Aliases, Defs, Models> extends { error: string }
        ? GetIdentifier<First & string, Aliases, Defs, Models>
        : GetConstraintTypes<Rest, Aliases, Defs, Models, [...R, GetIdentifier<First & string, Aliases, Defs, Models>]>
    : IntersectAll<R>
;

type ParseConfig<
    S      extends string ,
    Config extends {} = {},
> = S extends `${"\n" | ""}}${infer Rest}`
    ? [Config, Rest]
    : EatWhitespace<S> extends `\n${infer Rest}`
        ? EatWhitespace<Rest> extends `${infer Option}${Whitespace}${infer Rest}`
            ? EatWhitespace<Rest> extends `${infer Value}\n${infer Rest}`
                ? Primitivify<Value> extends never
                    ? SyntaxError
                    : ParseConfig<`\n${Rest}`, Config & { [K in Option]: Primitivify<Value> }>
                : [Config, S]
            : { error: "" }
        : [Config, S]
;

type ParseAlias<
    S       extends string      ,
    Aliases extends {}          ,
    Defs    extends {}          ,
    Models  extends {}          ,
    Alias              = unknown,
> = EatWhitespace<S> extends `\n${infer Rest}`
    ? [Alias, Rest]
    : S extends `${infer Line}\n${infer Rest}`
        ? [GetConstraintTypes<FilterIncorrect<GetDependencies<Line>>, Aliases, Defs, Models>, Rest]
        : S
;

type ParseDefine<
    S   extends string      ,
    Aliases extends {}      ,
    Defs    extends {}      ,
    Models  extends {}      ,
    Def extends unknown = {},
> = EatWhitespace<S> extends `}${infer Rest}`
    ? [Def, Rest]
    : EatWhitespace<S> extends `${infer Prop}${Whitespace}${infer Rest}`
        ? EatWhitespace<Rest> extends `${infer Constraints}\n${infer Rest}`
            ? ParseDefine<Rest, Aliases, Defs, Models, Def & { [K in Prop]: GetConstraintTypes<FilterIncorrect<GetDependencies<Constraints>>, Aliases, Defs, Models> }>
            : { error: "" }
        : { error: "" }
;

type ParseModel<
    S   extends string      ,
    Aliases extends {}      ,
    Defs    extends {}      ,
    Models  extends {}      ,
    Model extends unknown = {},
> = EatWhitespace<S> extends `}${infer Rest}`
    ? [Model, Rest]
    : EatWhitespace<S> extends `${infer Prop}${Whitespace}${infer Rest}`
        ? EatWhitespace<Rest> extends `${infer Constraints}\n${infer Rest}`
            ? ParseModel<Rest, Aliases, Defs, Models, Model & { [K in Prop]: GetConstraintTypes<FilterIncorrect<GetDependencies<Constraints>>, Aliases, Defs, Models> }>
            : { error: "" }
        : { error: "" }
;

type Parse<
    S extends string       ,
    Config  extends {} = {},
    Aliases extends {} = {},
    Defs    extends {} = {},
    Models  extends {} = {},
> = EatWhitespace<S> extends ""
    ? {
        config: Config;
        aliases: Aliases;
        defs: Defs;
        models: Models;
    }
    : S extends `\n${infer Rest}`
        ? Parse<Rest, Config, Aliases, Defs, Models>
        : EatWhitespace<S> extends `config${Whitespace}${infer Rest}`
            ? EatWhitespace<Rest> extends `{${infer Rest}`
                ? ParseConfig<Rest> extends { error: string }
                    ? ParseConfig<Rest>
                    : ParseConfig<Rest> extends [infer ParsedConfig, infer Rest]
                        ? Parse<Rest & string, Config & ParsedConfig, Aliases, Defs, Models>
                        : never
                : { error: "" }
            : EatWhitespace<S> extends `alias${Whitespace}${infer Rest}`
                ? EatWhitespace<Rest> extends `${infer Name}${Whitespace}${infer Rest}`
                    ? ParseAlias<Rest, Aliases, Defs, Models> extends { error: string }
                        ? ParseAlias<Rest, Aliases, Defs, Models>
                        : ParseAlias<Rest, Aliases, Defs, Models> extends [infer ParsedAlias, infer Rest]
                            ? Parse<Rest & string, Config, Aliases & { [K in Name]: ParsedAlias }, Defs, Models>
                            : never
                    : { error: "" }
                : EatWhitespace<S> extends `define${Whitespace}${infer Rest}`
                    ? EatWhitespace<Rest> extends `${infer Name}${Whitespace}${infer Rest}`
                        ? EatWhitespace<Rest> extends `{\n${infer Rest}`
                            ? ParseDefine<Rest, Aliases, Defs, Models> extends { error: string }
                                ? ParseDefine<Rest, Aliases, Defs, Models>
                                : ParseDefine<Rest, Aliases, Defs, Models> extends [infer Def, infer Rest]
                                    ? Parse<Rest & string, Config, Aliases, Defs & { [K in Name]: Def }, Models>
                                    : never
                            : { error: "" }
                        : { error: "" }
                    : EatWhitespace<S> extends `model${Whitespace}${infer Rest}`
                        ? EatWhitespace<Rest> extends `${infer Name}${Whitespace}${infer Rest}`
                            ? EatWhitespace<Rest> extends `{\n${infer Rest}`
                                ? ParseModel<Rest, Aliases, Defs, Models> extends { error: string }
                                    ? ParseModel<Rest, Aliases, Defs, Models>
                                    : ParseModel<Rest, Aliases, Defs, Models> extends [infer Model, infer Rest]
                                        ? Parse<Rest & string, Config, Aliases, Defs, Models & { [K in Name]: Model }>
                                        : never
                                : { error: "" }
                            : { error: "" }
                        : [Config, Aliases, Defs, Models]
;

export type ParseSchema<S extends string> = Parse<S>;
