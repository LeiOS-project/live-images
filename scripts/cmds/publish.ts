import { CLICMD, CMDFlag, CMDFlagsParser, type CLICMDExecMeta } from "@cleverjs/cli";
import { PublishingService } from "../services/publishingService";

export class PublishCMD extends CLICMD {

    override name = "publish";
    override description = "Publish the isos to Gitlab Registry.";
    override usage = "publish";

    private flagParser = new CMDFlagsParser({
        "--architecture": new CMDFlag("string", "The target architecture to publish (amd64 or arm64).", true, null)
    })

    override async run(args: string[]) {

        const parsedFlags = this.flagParser.parse(args);
        if (typeof parsedFlags === "string") {
            console.error("Error parsing flags:", parsedFlags);
            process.exit(1);
        }
        const architecture = parsedFlags["--architecture"];
        if (architecture !== "amd64" && architecture !== "arm64") {
            console.error("Invalid architecture specified. Must be 'amd64' or 'arm64'.");
            console.error("Usage:", "--base-dir=<dir> --architecture=<amd64|arm64>");
            process.exit(1);
        }

        const service = new PublishingService(architecture);
        await service.run();
    }

}
