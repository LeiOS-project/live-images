import { CLICMD, CMDFlag, CMDFlagsParser } from "@cleverjs/cli";
import { Utils } from "../utils";

export class BuildCMD extends CLICMD {

    override name = "build";
    override description = "Build the LeiOS live images.";
    override usage = "build";

    private flagParser = new CMDFlagsParser({
        "--base-dir": new CMDFlag("string", "The base directory where the built files are located.", true, null),
    })

    override async run(args: string[], meta: any) {

        const parsedFlags = this.flagParser.parse(args);
        if (typeof parsedFlags === "string") {
            console.error("Error parsing flags:", parsedFlags);
            return;
        }

        const baseDir = parsedFlags["--base-dir"];
        if (typeof baseDir !== "string" || baseDir.length === 0) {
            console.error("Invalid base-dir specified.");
            console.error("Usage:", "--base-dir=<dir>");
            return;
        }

        // await Utils.execNativeCommand(["lb", "clean", "--purge"], { cwd: "live-build" });
        // await Utils.execNativeCommand(["lb", "config"], { cwd: "live-build" });
        await Utils.execNativeCommand(["lb", "build"], { cwd: baseDir });
    }
}