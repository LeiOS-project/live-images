import { CLICMD, type CLICMDExecMeta } from "@cleverjs/cli";
import { Utils } from "../utils";
import { readdir as fs_readdir } from "fs/promises";

export class PublishCMD extends CLICMD {

    override name = "publish";
    override description = "Publish the isos to Gitlab Registry.";
    override usage = "publish";

    override async run(args: string[], meta: CLICMDExecMeta) {

        const GIT_DEPLOY_KEY_ID = Utils.requireEnvVariable("GIT_DEPLOY_KEY_ID");
        const GIT_DEPLOY_KEY_SECRET = Utils.requireEnvVariable("GIT_DEPLOY_KEY_SECRET");

        const files = this.getFilesWithVersion(await fs_readdir("."));

    }

    private getFilesWithVersion(files: string[]): { file: string, version: string }[] {
        const regex = /^leios-([0-9]+\.[0-9]+\.[0-9]+)-amd64\..*$/;
        const result: { file: string, version: string }[] = [];
        for (const file of files) {
            const match = file.match(regex);
            if (match) {
                const version = match[1];
                result.push({ file, version: version as string });
            }
        }
        return result;
    }

}
