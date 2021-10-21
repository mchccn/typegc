import { TypeGCPluginType } from "@typegc/plugin/index";

const owo = TypeGCPluginType.TOKENIZER;

(async () => {
    console.log(await import("./src/index"));
})();
