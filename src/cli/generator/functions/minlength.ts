export default (min: number, exclusive?: boolean) => {
  return Object.assign((v: number) => exclusive ? v.length > min : v.length >= min, {
    ts: `number`,
    js: exclusive ? `(v) => v.length > ${min}` : `(v) => v.length >= ${min}`,
    global: ``,
  });
};
