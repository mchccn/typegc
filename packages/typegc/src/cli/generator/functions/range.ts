export default (start: number, stop?: number, step?: number) => {
    return Object.assign(
        (v: number | string) => {
            if (typeof start === "number" && typeof stop === "number" && typeof step === "number") {
                if (typeof v === "string") return new RangeError(`String values cannot use the step parameter for the range factory.`);

                if (stop <= start) return new RangeError(`Stop parameter must be greater than the start parameter in the range factory.`);

                if (step <= 0) return new RangeError(`Step parameter for the range factory must be positive.`);

                return v >= start && v <= stop && (v - start) % step === 0;
            }

            if (typeof start === "number" && typeof stop === "number") {
                if (stop <= start) return new RangeError(`Stop parameter must be greater than the start parameter in the range factory.`);

                if (typeof v === "string") return v.length >= start && v.length <= stop;

                return v >= start && v <= stop;
            }

            if (typeof start === "number") {
                if (start < 0) {
                    if (typeof v === "string") throw new RangeError(`String values cannot use a negative end parameter in the range factory.`);

                    return v >= start;
                }

                return typeof v === "string" ? v.length <= start : v <= start && v >= 0;
            }

            throw new RangeError(`Expected 1-3 arguments for the range factory, got none.`);
        },
        {
            ts: `string | number`,
            js:
                typeof start === "number" && typeof stop === "number" && typeof step === "number"
                    ? `(v) => {
if (typeof v === "string") return new RangeError(\`String values cannot use the step parameter for the range factory.\`);

if (${stop} <= ${start}) return new RangeError(\`Stop parameter must be greater than the start parameter in the range factory.\`);

if (${step} <= 0) return new RangeError(\`Step parameter for the range factory must be positive.\`);

return v >= ${start} && v <= ${stop} && ((v - ${start}) % ${step}) === 0;
}`
                    : typeof start === "number" && typeof stop === "number"
                    ? `(v) => {
if (${stop} <= ${start}) return new RangeError(\`Stop parameter must be greater than the start parameter in the range factory.\`);

if (typeof v === "string") return v.length >= ${start} && v.length <= ${stop};

return v >= ${start} && v <= ${stop};
}`
                    : typeof start === "number"
                    ? `(v) => {
    if (${start} < 0) {
        if (typeof v === "string") throw new RangeError(\`String values cannot use a negative end parameter in the range factory.\`);

        return v >= ${start};
    }

    return typeof v === "string" ? v.length <= ${start} : v <= ${start} && v >= 0;
}`
                    : `() => false`,
            global: ``,
        }
    );
};
