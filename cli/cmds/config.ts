import { CLIBaseCommand, CLICommandArg, CLICommandArgParser } from "@cleverjs/cli";
import { Utils } from "../utils";


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

export class ConfigCMD extends CLIBaseCommand<typeof args> {

    constructor() {
        super({
            name: "config",
            description: "Configure the LeiOS live images.",
            args: args
        });
    }

    override async run(args: CLICommandArgParser.ParsedArgs<typeof this.args>): Promise<boolean> {

        await Utils.createTMPBuildDir();

        await Utils.execNativeCommand(["sudo", "lb", "config"], {
            cwd: "./tmp/build",
            env: {
                "INSERT_TARGET_ARCH": args.flags.architecture,
                "INSERT_TARGET_LIVE_VERSION": args.flags.version,
                //@TODO do a better solution for codename detection in the future
                "INSERT_BASE_CODENAME": "trixie",
            }
        });

        return true;
    }
}