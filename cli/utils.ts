import type { CLICommandContext } from "@cleverjs/cli";
import fs from "fs/promises";
import path from "path";

export namespace Utils {

    export function requireEnvVariable(name: string): string {
        const value = process.env[name];
        if (value === undefined) {
            throw new Error(`Environment variable ${name} is not set.`);
        }
        return value;
    }

    export async function execNativeCommand(commandParts: string[], options?: { cwd?: string, env?: Record<string, string | undefined> }): Promise<number> {

        let finalCommandParts = commandParts;

        const proc = Bun.spawn({
            cmd: finalCommandParts,
            stdout: "inherit",
            stderr: "inherit",
            ...options,
        });

        // // Stream stdout
        // void (async () => {
        //     for await (const chunk of proc.stdout) {
        //         process.stdout.write(chunk);
        //     }
        // })();

        // // Stream stderr
        // void (async () => {
        //     for await (const chunk of proc.stderr) {
        //         process.stderr.write(chunk);
        //     }
        // })();

        const exitCode = await proc.exited;
        if (exitCode !== 0) {
            throw new Error(`Command ${commandParts.join(" ")} exited with code ${exitCode}`);
        }

        return exitCode;
    }

    export function execShellCommand(command: string, options?: { cwd?: string, env?: Record<string, string | undefined> }): Promise<number> {
        return execNativeCommand(["bash", "-c", command], options);
    }

    export async function createTMPBuildDir(basePath?: string) {
        
        await Utils.removeTMPBuildDir(basePath);

        // create a temp dir
        await fs.mkdir(path.join(basePath ?? ".", "tmp"), { recursive: true, mode: 0o755 });

        await fs.cp("./debian-live", path.join(basePath ?? ".", "tmp", "build"), { recursive: true });
    }

    export async function removeTMPBuildDir(basePath?: string) {
        await fs.rm(path.join(basePath ?? ".", "tmp"), { recursive: true, force: true });
    }

}

export type CTX = CLICommandContext<{
    cwd?: string;
}>;
