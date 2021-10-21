import chalk from "chalk";

export const helpmsg = `
${chalk.blue("λ")} typegc - Pragmatic, configurable, and maintainable user-defined type guards, using a Prisma-like schema.

${chalk.bold("Usage")}

    ${chalk.dim("$")} typegc [command]

${chalk.bold("Commands")}

        init    create basic schema
    generate    generate type guards from schema
      plugin    manage third-party plugins
      format    prettify schema

${chalk.bold("Options")}

    ${chalk.dim("--")}source   ${chalk.dim("-")}s    schema file to target
    ${chalk.dim("--")}encoding ${chalk.dim("-")}e    file encoding
`;
