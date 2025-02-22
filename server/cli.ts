// A basic CLI to provide a custom config.toml & to choose between the two servers.
// Hono or Fastify
import chalk from 'chalk';
import gradient from 'npm:gradient-string';
import { message, messageColors } from "./message.ts";
import { parseArgs } from "jsr:@std/cli";
import { startServer as HonoServer } from './standalone/standalone.ts';
import { startServer as FastifyServer } from './full/server.ts';
import { fromFileUrl } from 'jsr:@std/path';

import packageJSON from "../package.json" with { type: 'json' };
const { version } = packageJSON;

interface CLIArgs {
    _: any[];
    help: boolean;
};

interface StartArgs extends CLIArgs {
    server: "full" | "standalone";
    config?: string;
    seo?: boolean;
};

interface UpgradeArgs extends CLIArgs {};

interface DescriptionType {
    name: string;
    description: string;
    default?: string;
};

class CLI<T extends CLIArgs> {
    #args: T;
    constructor(config: { booleans: string[], strings: string[] }) {
        this.#args = parseArgs(Deno.args, {
            boolean: config.booleans,
            string: config.strings
        }) as T;    
    }

    #white(text: string) {
        return chalk.whiteBright.bold(text);
    }

    getArgs(): T {
        return this.#args;
    }

    help(descriptions?: DescriptionType[]) {
        console.log(chalk.whiteBright.bold('--help - Trigger this menu'));
        descriptions?.map((val) => console.log(`${this.#white('--')}${this.#white(val.name)} ${this.#white('-')} ${this.#white(val.description)} ${val.default ? this.#white(`(default: ${val.default})`) : ''}`))
        Deno.exit();
    }

    async start(fn: () => unknown) {
        await fn();
    }
}

console.log(gradient(Object.values(messageColors)).multiline(message));
console.log(chalk.hex('#34b874')(`Welcome to the Incognito CLI!\nVersion: ${version}\n`));

const cli = new CLI<CLIArgs>({
    booleans: [], strings: []
});

const args = cli.getArgs();

if (args._.length !== 0 && args._[0] !== "upgrade") {
    console.log(chalk.redBright.bold(`The command ${args._[0]} is not available.\nPlease use a valid command`))
    Deno.exit();
}

if (args._[0] === "upgrade") {
    const upgradeCLI = new CLI<UpgradeArgs>({ booleans: [], strings: [] });
    await upgradeCLI.start(() => {});
    Deno.exit();
}

const startCLI = new CLI<StartArgs>({ 
    booleans: ["help", "seo"], strings: ["config"] 
});

const startArgs = startCLI.getArgs();

if (startArgs.help || !startArgs.server) {
    startCLI.help([
        { name: "server [full|standalone]", description: "Select the server type", default: "full" },
        { name: "config [path]", description: "The path to a custom config", default: 'config.toml' },
        { name: "seo", description: "Enable SEO website regardless of the config file", default: 'false' }
    ]);
}

if (startArgs.config) {
    const path = await Deno.realPath(startArgs.config);
    startArgs.config = path;
}

if (startArgs.server !== "full" && startArgs.server !== "standalone") {
    console.log(chalk.redBright.bold(`Error with option --server!\nThe value: "${startArgs.server}" is not valid!\nThe only available options are: "full" or "standalone"`));
}

startCLI.start(async () => {
    startArgs.server === "standalone"
        ? await HonoServer(startArgs.config ?? fromFileUrl(new URL('../config.toml', import.meta.url)), startArgs.seo)
        : await FastifyServer(startArgs.config ?? fromFileUrl(new URL('../config.toml', import.meta.url)), startArgs.seo)
});
