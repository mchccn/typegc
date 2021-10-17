import { Parser } from "./generator/parser";
import { Resolver } from "./generator/resolver";
import { Tokenizer } from "./generator/tokenizer";

export function format(schema: string) {
    const tokens = new Tokenizer(schema).tokenize();

    const structs = new Parser(tokens).parse();

    try {
        new Resolver(structs).resolve();
    } catch (e) {
        return e as Error;
    }

    const order = ["CONFIG", "ALIAS", "DEFINE", "MODEL"];

    structs.sort((a, b) => order.indexOf(a.type) - order.indexOf(b.type));

    return `\
${structs
    .flatMap((config) =>
        config.type === "CONFIG"
            ? [
                  `\
config {
${config.body
    .map(([prop, { value }]) => `    ${prop.value}${" ".repeat(Math.max(...config.body.map(([{ value }]) => value.length)) - prop.value.length)} ${value}`)
    .join("\n")}
}`,
              ]
            : []
    )
    .join("\n")}
    
${structs
    .flatMap((alias) =>
        alias.type === "ALIAS"
            ? [
                  `\
alias ${alias.name} ${alias.body.reduce((formatted, token, index, array) => {
                      if (token.type === "OPENING_PARENTHESES") return formatted + token.value;

                      if (token.type === "CLOSING_PARENTHESES") return formatted + token.value;

                      if (token.type === "COMMA") return formatted + token.value + " ";

                      if (["NUMBER", "STRING", "BOOLEAN"].includes(token.type)) return formatted + token.value;

                      return formatted ? formatted + " " + token.value : token.value;
                  }, "")}`,
              ]
            : []
    )
    .join("\n")}

${structs
    .flatMap((def) =>
        def.type === "DEFINE"
            ? [
                  `\
define ${def.name} {
${def.body
    .map(
        ([prop, ...rest]) =>
            `    ${prop.value}${" ".repeat(Math.max(...def.body.map(([{ value }]) => value.length)) - prop.value.length)} ${rest.reduce(
                (formatted, token, index, array) => {
                    if (token.type === "OPENING_PARENTHESES") return formatted + token.value;

                    if (token.type === "CLOSING_PARENTHESES") return formatted + token.value;

                    if (token.type === "COMMA") return formatted + token.value + " ";

                    if (["NUMBER", "STRING", "BOOLEAN"].includes(token.type)) return formatted + token.value;

                    return formatted ? formatted + " " + token.value : token.value;
                },
                ""
            )}`
    )
    .join("\n")}
}`,
              ]
            : []
    )
    .join("\n")}

${structs
    .flatMap((model) =>
        model.type === "MODEL"
            ? [
                  `\
model ${model.name} {
${model.body
    .map(
        ([prop, ...rest]) =>
            `    ${prop.value}${" ".repeat(Math.max(...model.body.map(([{ value }]) => value.length)) - prop.value.length)} ${rest.reduce(
                (formatted, token, index, array) => {
                    if (token.type === "OPENING_PARENTHESES") return formatted + token.value;

                    if (token.type === "CLOSING_PARENTHESES") return formatted + token.value;

                    if (token.type === "COMMA") return formatted + token.value + " ";

                    if (["NUMBER", "STRING", "BOOLEAN"].includes(token.type)) return formatted + token.value;

                    return formatted ? formatted + " " + token.value : token.value;
                },
                ""
            )}`
    )
    .join("\n")}
}`,
              ]
            : []
    )
    .join("\n")}`;
}
