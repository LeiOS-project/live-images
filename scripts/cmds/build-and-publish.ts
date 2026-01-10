import { CLICMD, CMDFlag, CMDFlagsParser } from "@cleverjs/cli";
import { Utils } from "../utils";
import { PublishingService } from "../services/publishingService";

export class BuildAndPublishCMD extends CLICMD {

    override name = "build-and-publish";
    override description = "Build and publish the LeiOS live images.";
    override usage = "build-and-publish";

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
        if (typeof version !== "string" || version.length === 0) {
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

        try {
            await Utils.execNativeCommand(["lb", "config"], {
                cwd: "./tmp/build",
                env: {
                    "INSERT_TARGET_ARCH": architecture,
                    "INSERT_TARGET_LIVE_VERSION": version,
                    //@TODO do a better solution for codename detection in the future
                    "INSERT_BASE_CODENAME": "trixie",
                }
            });
        } catch (err) {
            console.error("Error during configuration:", err);
            await Utils.removeTMPBuildDir();
            return;
        }

        try {
            await Utils.execNativeCommand(["lb", "build"], {
                cwd: "./tmp/build",
                env: {
                    "INSERT_TARGET_ARCH": architecture,
                    "INSERT_TARGET_LIVE_VERSION": version,
                    //@TODO do a better solution for codename detection in the future
                    "INSERT_BASE_CODENAME": "trixie",
                }
            });
        } catch (err) {
            console.error("Error during build:", err);
            await Utils.removeTMPBuildDir();
            return;
        }

        const service = new PublishingService(architecture);
        try {
            await service.run();
        } catch (err) {
            console.error("Error during publishing:", err);
            await Utils.removeTMPBuildDir();
            return;
        }

        try {
            await Utils.removeTMPBuildDir();
        } catch (err) {
            console.error("Error during cleanup:", err);
        }
    }
}