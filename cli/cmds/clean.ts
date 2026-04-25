import { CLIBaseCommand } from "@cleverjs/cli";
import { Utils, type CTX } from "../utils";

export class CleanCMD extends CLIBaseCommand {

    constructor() {
        super({
            name: "clean",
            description: "Clean the LeiOS live images.",
        });
    }

    override async run(_args: any, ctx: CTX) {
        await Utils.removeTMPBuildDir();
        console.log("Temporary build directory cleaned.");
        return true;
    }
}