import { CLIApp } from "@cleverjs/cli"
import { PublishCMD } from "./cmds/publish"

class CLI extends CLIApp {

    protected override onInit() {
        this.register(new PublishCMD());
    }

}

await new CLI("shell").handle(process.argv.slice(2));
