import { CLIApp } from "@cleverjs/cli"
import { PublishCMD } from "./cmds/publish"
import { BuildCMD } from "./cmds/build";
import { ConfigCMD } from "./cmds/config";
import { CleanCMD } from "./cmds/clean";
import { BuildAndPublishCMD } from "./cmds/build-and-publish";

class CLI extends CLIApp {

    protected override onInit() {
        this.register(new ConfigCMD());
        this.register(new BuildCMD());
        this.register(new CleanCMD());
        
        this.register(new PublishCMD());

        this.register(new BuildAndPublishCMD())
    }

}

await new CLI("shell").handle(process.argv.slice(2));
