import { CLIBaseCommand } from "@cleverjs/cli";
import { Utils } from "../utils";

export class CleanCMD extends CLIBaseCommand {

    constructor() {
        super({
            name: "clean",
            description: "Clean the LeiOS live images.",
        });
    }

    override async run() {
        await Utils.removeTMPBuildDir();
        console.log("Temporary build directory cleaned.");
    }
}