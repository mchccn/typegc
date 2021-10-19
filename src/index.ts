//@ts-nocheck

import * as guards from ".typegc";
import { interpret as typegc } from "./interpret";

export * from ".typegc";

export default Object.assign(typegc, guards);
