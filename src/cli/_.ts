import { Generator } from "./generator";

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

console.clear();

console.log(new Generator(schema).generate());
