import { CLIApp } from "@cleverjs/cli"
import { PublishCMD } from "./cmds/publish"
import { BuildCMD } from "./cmds/build";
import { ConfigCMD } from "./cmds/config";
import { CleanCMD } from "./cmds/clean";
import { BuildAndPublishCMD } from "./cmds/build-and-publish";

await new CLIApp()

    .register(new ConfigCMD())
    .register(new BuildCMD())
    .register(new CleanCMD())

    .register(new PublishCMD())

    .register(new BuildAndPublishCMD())

    .handle(process.argv.slice(2), "shell");
