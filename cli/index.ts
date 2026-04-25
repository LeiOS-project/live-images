import { CLIApp, CLICommandArg } from "@cleverjs/cli"
import { PublishCMD } from "./cmds/publish"
import { BuildCMD } from "./cmds/build";
import { ConfigCMD } from "./cmds/config";
import { CleanCMD } from "./cmds/clean";
import { BuildAndPublishCMD } from "./cmds/build-and-publish"; 
import type { CTX } from "./utils";

await new CLIApp({
    globalFlags: [
        {
            name: "cwd",
            type: "string",
            required: false,
            description: "The directory to run the command in."
        }
    ]
})

    .use(async (flags, ctx: CTX, next) => {

        if (flags.cwd) {
            ctx.set("cwd", flags.cwd);
        }
        
        await next();

    })

    .register(new ConfigCMD())
    .register(new BuildCMD())
    .register(new CleanCMD())

    .register(new PublishCMD())

    .register(new BuildAndPublishCMD())

    .handle(process.argv.slice(2), "shell");
