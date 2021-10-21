export function isSnakeCase(string: string) {
    return /^[a-z]+(_[a-z]+)*$/.test(string);
}
