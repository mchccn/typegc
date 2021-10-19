#!/usr/bin/env node

import index from ".";

(async () => {
  if (require.main === module) {
    process.env.TYPEGC_EXEC_TYPE = "cli";

    await index();
    
    return;
  }
  
  throw new Error("Do not import the CLI when using TypeGC in your application.");
})().catch(console.error);
