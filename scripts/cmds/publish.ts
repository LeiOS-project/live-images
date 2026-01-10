import { CLICMD, type CLICMDExecMeta } from "@cleverjs/cli";
import { Utils } from "../utils";
import { readdir as fs_readdir } from "fs/promises";

export class PublishCMD extends CLICMD {

    override name = "publish";
    override description = "Publish the isos to Gitlab Registry.";
    override usage = "publish";

    override async run(args: string[], meta: CLICMDExecMeta) {

        const files = await this.checkFiles(await fs_readdir("./live-build"));

        for (const [version, versionFiles] of Object.entries(files)) {
            console.log(`Uploading files for version ${version}...`);
            await this.uploadFiles(version, versionFiles);
        }
    }

    private async checkFiles(files: string[]) {

        const versions: Record<string, string[]> = {};

        const regex = /^leios-([0-9]+\.[0-9]+\.[0-9]+)-amd64\..*$/;
        for (const file of files) {
            const match = file.match(regex);
            if (match) {
                const version = match[1];
                if (typeof version !== "string") {
                    continue;
                }

                if (!versions[version]) {
                    versions[version] = [];
                }
                versions[version].push(file);
            }
        }


        const existingFiles = await this.getExistingUploadedFiles(Object.keys(versions));
        
        const results: Record<string, string[]> = {};

        for (const [version, versionFiles] of Object.entries(versions)) {

            const requiredFiles = [
                `leios-${version}-amd64.hybrid.iso`,
                `leios-${version}-amd64.files`,
                `leios-${version}-amd64.packages`,
                `leios-${version}-amd64.contents`,
            ];

            if (!requiredFiles.every(f => versionFiles.includes(f))) {
                continue;
            }
            if (versionFiles.length !== requiredFiles.length) {
                continue;
            }

            // results[version] = versionFiles.filter(f => !existingFiles.includes(f));

            const toUpload = [];
            for (const file of versionFiles) {
                if (!existingFiles[version]?.includes(file)) {
                    toUpload.push(file);
                } else {
                    console.log(`File ${file} for version ${version} already exists, skipping upload.`);
                }
            }
            if (toUpload.length === 0) {
                continue;
            }
            results[version] = toUpload;

        }
        return results;
    }

    private async uploadFiles(version: string, files: string[]) {

        for (const file of files) {
            await this.uploadFile(version, file);
        }

    }

    private async uploadFile(version: string, file: string) {

        const GIT_DEPLOY_KEY_ID = Utils.requireEnvVariable("GIT_DEPLOY_KEY_ID");
        const GIT_DEPLOY_KEY_SECRET = Utils.requireEnvVariable("GIT_DEPLOY_KEY_SECRET");

        const result = await Bun.spawn([
            "curl",
            "--location",
            "--user",
            `${GIT_DEPLOY_KEY_ID}:${GIT_DEPLOY_KEY_SECRET}`,
            "--upload-file", `./live-build/${file}`,
            `https://git.leicraftmc.de/api/v4/projects/5/packages/generic/release-${version}/${version}/${file}`,
        ]).exited;

        if (result !== 0) {
            console.error(`Failed to upload file ${file} for version ${version}.`);
        } else {
            console.log(`Uploaded file ${file} for version ${version}.`);
        }
    }

    private async getExistingUploadedFiles(requestedVersions: string[]): Promise<Record<string, string[]>> {

        const response = await fetch("https://git.leicraftmc.de/api/v4/projects/5/packages");
        if (!response.ok) {
            throw new Error(`Failed to fetch packages: ${response.status} ${response.statusText}`);
        }
        const verionsData = await response.json() as Array<{
            id: number,
            name: string,
            version: string,
            package_type: string,
            status: string,
            _links: Record<string, string>,
            created_at: string,
            last_downloaded_at: string,
            tags: []
        }>;

        const result: Record<string, string[]> = {};

        for (const pkg of verionsData) {
            if (!requestedVersions.includes(pkg.version) || pkg.package_type !== "generic" || pkg.name.startsWith("release-") === false) {
                continue;
            }
            const response = await fetch(`https://git.leicraftmc.de/api/v4/projects/5/packages/${pkg.id}/package_files`);
            if (!response.ok) {
                throw new Error(`Failed to fetch existing files: ${response.status} ${response.statusText}`);
            }

            const data = await response.json() as Array<{
                id: number,
                package_id: number,
                created_at: string,
                file_name: string,
                size: number,
                file_md5: string | null,
                file_sha1: string | null,
                file_sha256: string | null
            }>;

            result[pkg.version] = data.map(file => file.file_name);
        }

        return result;
    }

}
