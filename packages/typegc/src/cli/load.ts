import { readdir } from "fs/promises";
import { join } from "path";
import { exists } from "./utils/exists";

export async function loadPlugins() {
    if ((await exists(join(process.cwd(), "node_modules"))) && (await exists(join(process.cwd(), "node_modules", "@typegc")))) {
        const plugins = (await Promise.all((await readdir(join(process.cwd(), "node_modules", "@typegc"))).map((name) => import(`@typegc/${name}`)))).map(
            (plugin) => plugin.default
        );

        return plugins;
    }

    return [];
}
