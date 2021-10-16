import chalk from "chalk";
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";
import yargs from "yargs";
import { helpmsg } from "./constants";
import { Resolver } from "./generator/resolver";
import { exists } from "./utils/exists";

export default async function index() {
    if (process.argv.length === 2) return console.log(helpmsg);

    yargs
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
    version "1.0.0"
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
                yargs.option("source", {
                    type: "string",
                    alias: "s",
                    description: `target typegc schema's relative path`,
                    default: join(process.cwd(), "typegc", "schema.typegc"),
                }),
            async (args) => {
                console.log(`NOT IMPLEMENTED YET`);
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
            (yargs) => yargs,
            async (args) => {}
        )
        .parse();

    await Resolver.load();
}
