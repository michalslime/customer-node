import { SystemHeartbeat } from "src/npm-package-candidate/system-heartbeat";
import { Command } from "./command";
import { Injectable, Scope } from "@nestjs/common";

@Injectable({scope: Scope.TRANSIENT})
export class CommandCenterService {
    private commandQueue: Command<any>[] = [];

    constructor(
        private readonly systemHeartbeat: SystemHeartbeat,
    ) { }

    enqueueCommand<T>(command: Command<T>, commonId: string) {
        this.systemHeartbeat.logInfo(commonId, `Enqueuing command of type ${command.type} created at ${command.createdTimestamp}`, command);
        this.commandQueue.push(command);
    }

    popCommands(timestamp: number, commonId: string): Command<any>[] {
        const commandsToReturn = this.commandQueue.filter(cmd => cmd.createdTimestamp > timestamp);
        this.systemHeartbeat.logInfo(commonId, `Popping commands created after ${timestamp}`, commandsToReturn);
        return commandsToReturn;
    }
}
