import chalk from "chalk";
import { mkdir, readFile, writeFile } from "fs/promises";
import { join } from "path";
import prettier from "prettier";
import yargs from "yargs";
import { helpmsg } from "./constants";
import { format } from "./format";
import { Generator } from "./generator/index";
import { Resolver } from "./generator/resolver";
import { exists } from "./utils/exists";
import { version } from "./utils/version";

export default async function index() {
    if (process.argv.length === 2) return console.log(helpmsg);

    const prettierconfig = (await prettier.resolveConfig(process.cwd(), { editorconfig: true })) ?? {};

    await Resolver.load();

    await yargs
        .help(false)
        .command(
            "help",
            "",
            (yargs) => yargs,
            () => console.log(helpmsg)
        )
        .command(
            "init",
            "",
            (yargs) => yargs,
            async (args) => {
                if (!(await exists(join(process.cwd(), "package.json")))) {
                    console.log(chalk.red(`File package.json not found.`));
                    process.exit(0);
                }

                if (!(await exists(join(process.cwd(), "typegc")))) await mkdir(join(process.cwd(), "typegc"));

                if (!(await exists(join(process.cwd(), "typegc", "schema.typegc"))))
                    await writeFile(
                        join(process.cwd(), "typegc", "schema.typegc"),
                        `\
config {
    strict  true
    version "${version()}"
}
                `
                    );
                else {
                    console.log(chalk.red(`Schema already created.`));
                    process.exit(0);
                }

                console.log(chalk.green(`Created boilerplate schema in typegc/schema.typegc!`));
            }
        )
        .command(
            "generate",
            "",
            (yargs) =>
                yargs
                    .option("source", {
                        type: "string",
                        alias: "s",
                        description: `target typegc schema's relative path`,
                        default: join(process.cwd(), "typegc", "schema.typegc"),
                    })
                    .option("encoding", {
                        type: "string",
                        alias: "e",
                        description: `typegc schema file encoding`,
                        choices: ["ascii", "utf8", "utf-8", "utf16le", "ucs2", "ucs-2", "base64", "base64url", "latin1", "binary", "hex"],
                        default: "utf8",
                    }),
            async (args) => {
                const schema = await readFile(args.source, args.encoding as BufferEncoding);

                const [js, dts] = new Generator(schema).generate();

                if (!(await exists(join(process.cwd(), "node_modules", ".typegc")))) await mkdir(join(process.cwd(), "node_modules", ".typegc"));

                const now = Date.now();

                await writeFile(
                    join(process.cwd(), "node_modules", ".typegc", "index.js"),
                    prettier.format(js, { ...prettierconfig, parser: "babel" }),
                    args.encoding as BufferEncoding
                );

                await writeFile(
                    join(process.cwd(), "node_modules", ".typegc", "index.d.ts"),
                    prettier.format(dts, { ...prettierconfig, parser: "typescript" }),
                    args.encoding as BufferEncoding
                );

                await writeFile(
                    join(process.cwd(), "node_modules", ".typegc", "package.json"),
                    prettier.format(
                        JSON.stringify({
                            name: ".typegc",
                            version: version(),
                            description: "Pragmatic, configurable, and maintainable user-defined type guards, using a Prisma-like schema.",
                            main: "index.js",
                            typings: "index.d.ts",
                        }),
                        { ...prettierconfig, parser: "json" }
                    ),
                    args.encoding as BufferEncoding
                );

                console.log(chalk.blue(`Done in ${Date.now() - now}ms ✨!`));
            }
        )
        .command(
            "plugin",
            "",
            (yargs) => yargs,
            async (args) => {}
        )
        .command(
            "format",
            "",
            (yargs) =>
                yargs
                    .option("source", {
                        type: "string",
                        alias: "s",
                        description: `relative path to typegc schema to format`,
                        default: join(process.cwd(), "typegc", "schema.typegc"),
                    })
                    .option("encoding", {
                        type: "string",
                        alias: "e",
                        description: `typegc schema file encoding`,
                        choices: ["ascii", "utf8", "utf-8", "utf16le", "ucs2", "ucs-2", "base64", "base64url", "latin1", "binary", "hex"],
                        default: "utf8",
                    }),
            async (args) => {
                const schema = await readFile(args.source, args.encoding as BufferEncoding);

                const start = Date.now();

                const formatted = format(schema);

                if (formatted instanceof Error) {
                    console.log(chalk.red(`Encountered error while formatting:`), formatted);

                    return process.exit(1);
                }

                await writeFile(args.source, formatted, args.encoding as BufferEncoding);

                return console.log(chalk.blue(`Done in ${Date.now() - start}ms ✨!`));
            }
        )
        .parse();

    return process.exit(0);
}
