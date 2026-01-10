
export namespace Utils {

    export function requireEnvVariable(name: string): string {
        const value = process.env[name];
        if (value === undefined) {
            throw new Error(`Environment variable ${name} is not set.`);
        }
        return value;
    }

    export function execNativeCommand(commandParts: string[]): Promise<number> {

        const proc = Bun.spawn({
            cmd: commandParts,
            stdout: "inherit",
            stderr: "inherit"
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

    export function execShellCommand(command: string): Promise<number> {
        return execNativeCommand(["bash", "-c", command],);
    }

}
