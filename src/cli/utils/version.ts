import { readFileSync } from "fs";
import { join } from "path";

let cachedversion = "";

export function version() {
    if (cachedversion) return cachedversion;

    cachedversion = JSON.parse(readFileSync(join(__dirname, "..", "..", "..", "package.json"), "utf8")).version;

    return cachedversion;
}
