import { Generator } from "../src/cli/generator/index";
import { Parser } from "../src/cli/generator/parser";
import { Resolver } from "../src/cli/generator/resolver";
import { Tokenizer } from "../src/cli/generator/tokenizer";
import { TEST_TYPES } from "./shared.test";

describe(`${TEST_TYPES.ISSUE} Benchmark: manual vs typegc`, () => {
    const schema = `
    config {
      strict true
    }
    
    alias ErrorCode range(400, 599)
    
    define ErrorObject {
      message string
      stack   string
    }
    
    model APIError {
      status   number      ErrorCode
      message  string
      endpoint string      match("(/[^/]*)+")
      error    ErrorObject
    }
    `;

    before(() => Resolver.load());

    it("Aryn's original request", (done) => {
        const avgs = [0n, 0n, 0n];

        function manual(v: any) {
            return (
                typeof v === "object" &&
                typeof v["status"] === "number" &&
                v["status"] >= 400 &&
                v["status"] <= 599 &&
                typeof v["message"] === "string" &&
                typeof v["endpoint"] === "string" &&
                /(\/[^\/]*)+/.test(v["endpoint"]) &&
                typeof v["error"] === "object" &&
                typeof v["message"] === "string" &&
                typeof v["stack"] === "string"
            );
        }

        const interpreted = new Resolver(new Parser(new Tokenizer(schema).tokenize()).parse()).resolve().models.get("APIError")!;
        const compiled = eval(new Generator(schema).generate()[0].replace(/export const isAPIError = /, ""));

        for (let i = 0; i < 1000000; i++) {
            {
                const start = process.hrtime.bigint();

                manual({
                    status: 400,
                    message: "",
                    endpoint: "/",
                    error: {
                        message: "",
                        stack: "",
                    },
                });

                const mt = process.hrtime.bigint() - start;

                avgs[0] += mt;
            }

            const typegci = process.hrtime.bigint();

            interpreted({
                status: 400,
                message: "",
                endpoint: "/",
                error: {
                    message: "",
                    stack: "",
                },
            });

            const tt1 = process.hrtime.bigint() - typegci;

            avgs[1] += tt1;

            const typegcc = process.hrtime.bigint();

            compiled({
                status: 400,
                message: "",
                endpoint: "/",
                error: {
                    message: "",
                    stack: "",
                },
            });

            const tt2 = process.hrtime.bigint() - typegcc;

            avgs[2] += tt2;
        }

        avgs[0] /= 1000000n;
        avgs[1] /= 1000000n;
        avgs[2] /= 1000000n;

        console.log(`
  Manual               : ${avgs[0]}ns
  TypeGC (interpreted) : ${avgs[1]}ns
  TypeGC (compiled)    : ${avgs[2]}ns
`);

        return done();
    });
});
