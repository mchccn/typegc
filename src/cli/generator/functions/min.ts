export default (min: number, exclusive?: boolean) => {
  return Object.assign((v: number) => exclusive ? v > min : v >= min, {
    ts: `number`,
    js: exclusive ? `(v) => v > ${min}` : `(v) => v >= ${min}`,
    global: ``,
  });
};
