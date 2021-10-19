import { uuid } from "../uuid";

export default (pattern: string, flags?: string) => {
    if (typeof pattern !== "string") return new TypeError(`Pattern provided to the match factory must be a string.`);
    
    if (!pattern) return new TypeError(`Pattern provided to the match factory cannot be empty.`);
    
    if (typeof flags !== "undefined" && typeof flags !== "string") return new TypeError(`Flags provided to the match factory must be a string.`);

    const regex = new RegExp(pattern, flags);

    const id = uuid.next().value;

    return Object.assign((v: string) => regex.test(v), {
        ts: `string`,
        js: `(v) => {{ name }}${id}.test(v)`,
        global: `const {{ name }}${id} = new RegExp("${pattern.replaceAll('"', '\\"')}");`,
    });
};
