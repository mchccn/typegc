import { access } from "fs/promises";

export function exists(path: string) {
    return access(path)
        .then(() => true)
        .catch(() => false);
}
