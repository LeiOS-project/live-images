import { CLIApp } from "@cleverjs/cli"
import { PublishCMD } from "./cmds/publish"
import { BuildCMD } from "./cmds/build";

class CLI extends CLIApp {

    protected override onInit() {
        this.register(new PublishCMD());
        this.register(new BuildCMD());
    }

}

await new CLI("shell").handle(process.argv.slice(2));
