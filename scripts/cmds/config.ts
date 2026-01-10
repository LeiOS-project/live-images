import { CLICMD, CMDFlag, CMDFlagsParser } from "@cleverjs/cli";
import { Utils } from "../utils";

export class ConfigCMD extends CLICMD {

    override name = "config";
    override description = "Configure the LeiOS live images.";
    override usage = "config";

    private flagParser = new CMDFlagsParser({
        "--version": new CMDFlag("string", "The version of the LeiOS live image to build.", true, null),
        "--architecture": new CMDFlag("string", "The target architecture to publish (amd64 or arm64).", true, null)
    })

    override async run(args: string[]) {

        const parsedFlags = this.flagParser.parse(args);
        if (typeof parsedFlags === "string") {
            console.error("Error parsing flags:", parsedFlags);
            return;
        }

        const version = parsedFlags["--version"];
        const version_regex = /^[0-9]+\.[0-9]+\.[0-9]+-\d{12}$/;
        if (typeof version !== "string" || !version_regex.test(version)) {
            console.error("Invalid version specified.");
            console.error("Usage:", "--base-dir=<dir> --architecture=<amd64|arm64> --version=<version>");
            return;
        }

        const architecture = parsedFlags["--architecture"];
        if (architecture !== "amd64" && architecture !== "arm64") {
            console.error("Invalid architecture specified. Must be 'amd64' or 'arm64'.");
            console.error("Usage:", "--base-dir=<dir> --architecture=<amd64|arm64> --version=<version>");
            return;
        }

        await Utils.createTMPBuildDir();

        await Utils.execNativeCommand(["sudo", "--preserve-env", "lb", "config"], {
            cwd: "./tmp/build",
            env: {
                "INSERT_TARGET_ARCH": architecture,
                "INSERT_TARGET_LIVE_VERSION": version,
                //@TODO do a better solution for codename detection in the future
                "INSERT_BASE_CODENAME": "trixie",
            }
        });
    }
}