import { CLIBaseCommand, CLICommandArg, CLICommandArgParser } from "@cleverjs/cli";
import { Utils } from "../utils";
import { PublishingService } from "../services/publishingService";

const args = CLICommandArg.defineCLIArgSpecs({
    args: [],
    flags: [
        {
            name: "version",
            type: "string",
            required: true,
            description: "The version of the LeiOS live image to build.",
            shortName: "v",
        },
        {
            name: "architecture",
            type: "enum",
            required: true,
            allowedValues: ["amd64", "arm64"],
            description: "The target architecture to publish (amd64 or arm64).",
            shortName: "a",
            aliases: ["arch"]
        }
    ],
});


export class BuildAndPublishCMD extends CLIBaseCommand<typeof args> {

    constructor() {
        super({
            name: "build-and-publish",
            description: "Build and publish the LeiOS live images.",
            args: args
        });
    }
    
    override async run(args: CLICommandArgParser.ParsedArgs<typeof this.args>): Promise<boolean> {


        await Utils.createTMPBuildDir();

        try {
            await Utils.execNativeCommand(["sudo", "lb", "build"], {
                cwd: "./tmp/build",
                env: {
                    "INSERT_TARGET_ARCH": args.flags.architecture,
                    "INSERT_TARGET_LIVE_VERSION": args.flags.version,
                    //@TODO do a better solution for codename detection in the future
                    "INSERT_BASE_CODENAME": "trixie",
                }
            });
        } catch (err) {
            console.error("Error during build:", err);
            await Utils.removeTMPBuildDir();
            process.exit(1);
        }

        const service = new PublishingService("auto", args.flags.architecture);
        try {
            await service.run();
        } catch (err) {
            console.error("Error during publishing:", err);
            await Utils.removeTMPBuildDir();
            process.exit(1);
        }

        try {
            await Utils.removeTMPBuildDir();
        } catch (err) {
            console.error("Error during cleanup:", err);
            process.exit(1);
        }

        return true;
    }
}