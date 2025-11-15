import { CLICMD } from "@cleverjs/cli";
import { Utils } from "../utils";

export class BuildCMD extends CLICMD {

    override name = "build";
    override description = "Build the LeiOS live images.";
    override usage = "build";

    override async run(args: string[], meta: any) {
        await Utils.execNativeCommand("lb clean --all");
        await Utils.execNativeCommand("lb config");
        await Utils.execNativeCommand("lb build");
    }
}