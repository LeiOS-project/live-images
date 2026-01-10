import { CLICMD } from "@cleverjs/cli";
import { Utils } from "../utils";

export class ConfigCMD extends CLICMD {

    override name = "config";
    override description = "Configure the LeiOS live images.";
    override usage = "config";

    override async run(args: string[], meta: any) {
        await Utils.execNativeCommand(["lb", "config"]);
    }
}