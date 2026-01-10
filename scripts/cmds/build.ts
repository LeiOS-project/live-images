import { CLICMD } from "@cleverjs/cli";
import { Utils } from "../utils";

export class BuildCMD extends CLICMD {

    override name = "build";
    override description = "Build the LeiOS live images.";
    override usage = "build";

    override async run(args: string[], meta: any) {
        await Utils.execNativeCommand(["lb", "clean", "--purge"], { cwd: "live-build" });
        await Utils.execNativeCommand(["lb", "config"], { cwd: "live-build" });
        await Utils.execNativeCommand(["lb", "build"], { cwd: "live-build" });
    }
}