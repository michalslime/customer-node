import { SystemHeartbeat } from "src/npm-package-candidate/system-heartbeat";
import { Command, CommandType } from "./command";
import { Coin } from "src/npm-package-base/types";

export class CommandCenterService {
    private commandQueue: Command<any>[] = [];

    constructor(
        public readonly name: string,
        private readonly systemHeartbeat: SystemHeartbeat,
    ) { }

    public enqueueCommand<T>(command: Command<T>, commonId: string): void {
        this.systemHeartbeat.logInfo(commonId, `Enqueuing command of type ${command.type} created at ${command.createdTimestamp} into ${this.name}`, command);
        this.commandQueue.push(command);
    }

    public popCommands(timestamp: number, commonId: string): Command<any>[] {
        const commandsToReturn = this.commandQueue.filter(cmd => cmd.createdTimestamp > timestamp);
        this.systemHeartbeat.logInfo(commonId, `Popping commands created after ${timestamp} for ${this.name}`, commandsToReturn);
        return commandsToReturn;
    }

    public static generateCommand<T>(commonId: string, coin: Coin | string, type: CommandType, payload?: T): Command<T> {
        const command = new Command<T>();
        command.id = crypto
            .randomUUID()
            .replace(/-/g, '')
            .slice(0, 5)
            .toUpperCase();
        command.commonId = commonId;
        command.coin = coin;
        command.createdTimestamp = Date.now();
        command.type = type;
        command.payload = payload;

        return command
    }
}
