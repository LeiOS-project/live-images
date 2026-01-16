import { CLIBaseCommand, CLICommandArg, CLICommandArgParser, type CLICommandContext } from "@cleverjs/cli";
import { PublishingService } from "../services/publishingService";

const args = CLICommandArg.defineCLIArgSpecs({
    args: [],
    flags: [
        {
            name: "version",
            type: "string",
            description: "The version of the LeiOS live image to build.",
            shortName: "v",
        },
        {
            name: "architecture",
            type: "enum",
            default: "all",
            allowedValues: ["amd64", "arm64", "all"],
            description: "The target architecture to publish (amd64 or arm64).",
            shortName: "a",
            aliases: ["arch"]
        }
    ],
});

export class PublishCMD extends CLIBaseCommand<typeof args> {

    override name = "publish";
    override description = "Publish the isos to Gitlab Registry.";

    constructor() {
        super({
            name: "publish",
            description: "Publish the isos to Gitlab Registry.",
            args: args
        });
    }

    override async run(args: CLICommandArgParser.ParsedArgs<typeof this.args>, ctx: CLICommandContext): Promise<void> {
        const service = new PublishingService(args.flags.version ?? "auto", args.flags.architecture);
        await service.run();
    }

}
