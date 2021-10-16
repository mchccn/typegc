import { uuid } from "../uuid";

export default (pattern: string, flags?: string) => {
    if (!pattern) return new TypeError(`Pattern provided to the match factory cannot be empty.`);

    const regex = new RegExp(pattern, flags);

    const id = uuid.next().value;

    return Object.assign((v: string) => regex.test(v), {
        ts: `string`,
        js: `(v) => {{ name }}${id}.test(v)`,
        global: `const {{ name }}${id} = new RegExp("${pattern.replaceAll('"', '\\"')}");`,
    });
};
