import { join } from "path";
import yargs from "yargs";
import { helpmsg } from "./constants";
import { Resolver } from "./generator/resolver";

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
            "generate",
            "",
            (yargs) =>
                yargs.option("source", {
                    type: "string",
                    alias: "s",
                    description: `target typegc schema's relative path`,
                    default: join(process.cwd(), "typegc", "schema.typegc"),
                }),
            (args) => {
                console.log(`NOT IMPLEMENTED YET`);
            }
        )
        .parseSync();

    await Resolver.load();
}
