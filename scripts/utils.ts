import fs from "fs/promises";

export namespace Utils {

    export function requireEnvVariable(name: string): string {
        const value = process.env[name];
        if (value === undefined) {
            throw new Error(`Environment variable ${name} is not set.`);
        }
        return value;
    }

    export function execNativeCommand(commandParts: string[], options?: { cwd?: string, env?: Record<string, string | undefined> }): Promise<number> {

        const proc = Bun.spawn({
            cmd: commandParts,
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

        return proc.exited;
    }

    export function execShellCommand(command: string, options?: { cwd?: string, env?: Record<string, string | undefined> }): Promise<number> {
        return execNativeCommand(["bash", "-c", command], options);
    }

    export async function createTMPBuildDir() {
        
        await Utils.removeTMPBuildDir();

        // create a temp dir
        await fs.mkdir("./tmp/build", { recursive: true, mode: 0o755 });
    }

    export async function removeTMPBuildDir() {
        await Utils.execNativeCommand(["lb", "clean", "--purge"], { cwd: "./tmp/build" });
        await fs.rm("./tmp", { recursive: true, force: true });
    }

}
