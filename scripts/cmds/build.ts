import { CLICMD } from "@cleverjs/cli";

export class BuildCMD extends CLICMD {

    override name = "build";
    override description = "Build the LeiOS live images.";
    override usage = "build";

    override async run(args: string[], meta: any) {
        await Bun.$`lb clean --all`;
        await Bun.$`lb config`;
        await Bun.$`lb build`;
    }
}