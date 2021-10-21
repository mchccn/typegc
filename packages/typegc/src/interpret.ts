import { Parser } from "./cli/generator/parser";
import { Resolver } from "./cli/generator/resolver";
import { Tokenizer } from "./cli/generator/tokenizer";

export function interpret<Schema extends string>(schema: Schema) {
    const resolved = new Resolver(new Parser(new Tokenizer(schema).tokenize()).parse()).resolve();

    return Object.fromEntries([...resolved.models.entries()].map(([name, model]) => [name, model.bind({})] as [string, (v: unknown) => boolean]));
}
