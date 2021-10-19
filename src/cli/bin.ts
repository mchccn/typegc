#!/usr/bin/env node

import index from ".";

(() => {
  if (require.main === module) {
    process.env.TYPEGC_EXEC_TYPE = "cli";

    return index();
  }
  
  throw new Error("Do not import the CLI when using TypeGC in your application.");
})();
