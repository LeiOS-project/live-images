import { CLICMD } from "@cleverjs/cli";
import { Utils } from "../utils";

export class CleanCMD extends CLICMD {

    override name = "clean";
    override description = "Clean the LeiOS live images.";
    override usage = "clean";

    override async run(args: string[], meta: any) {
        await Utils.execNativeCommand(["lb", "clean", "--purge"]);
    }
}