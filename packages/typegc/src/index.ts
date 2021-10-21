//@ts-nocheck

import * as guards from ".typegc";
import { interpret } from "./interpret";

const typegc = Object.assign(interpret, guards);

export * from ".typegc";
export default typegc;
module.exports = typegc;
module.exports.default = typegc;
