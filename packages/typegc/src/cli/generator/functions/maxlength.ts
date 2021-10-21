export default (max: number, exclusive?: boolean) => {
  return Object.assign((v: string) => exclusive ? v.length < max : v.length <= max, {
    ts: `string`,
    js: exclusive ? `(v) => v.length < ${max}` : `(v) => v.length <= ${max}`,
    global: ``,
  });
};
