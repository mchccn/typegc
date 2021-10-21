export default (max: number, exclusive?: boolean) => {
  return Object.assign((v: number) => exclusive ? v < max : v <= max, {
    ts: `number`,
    js: exclusive ? `(v) => v < ${max}` : `(v) => v <= ${max}`,
    global: ``,
  });
};
