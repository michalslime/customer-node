import { HttpService } from "@nestjs/axios";
import { Injectable } from "@nestjs/common";
import { firstValueFrom } from "rxjs";
import { Command } from "src/models/command";
import { getHeaderWithCommonId, SystemHeartbeat } from "src/npm-package-candidate/system-heartbeat";

@Injectable()
export class CommandsService {
    public lastFullfieldCommandTimestamp: number = Date.now();

    constructor(
        private readonly source: string,
        private readonly sourceUrl,
        private readonly http: HttpService,
        private readonly systemHeartbeat: SystemHeartbeat
    ) { }

    public async getCommandsAsync(commonId: string): Promise<Command<any>[]> {
        try {
            const url = `${this.sourceUrl}/investing/customer-commands/${this.lastFullfieldCommandTimestamp}`;

            this.systemHeartbeat.logInfo(commonId, `Fetching commands from ${this.source}`, { url: url });

            const response = await firstValueFrom(
                this.http.get<Command<any>[]>(url, getHeaderWithCommonId(commonId))
            );

            const commands = response.data;
            const sortedCommands =  commands.sort((a, b) => a.createdTimestamp - b.createdTimestamp);

            this.systemHeartbeat.logInfo(commonId, `Fetched ${sortedCommands.length} commands from ${this.source}`, sortedCommands);

            return sortedCommands;
        } catch (error: any) {
            throw new Error(`Failed to fetch commands: ${error.message}`);
        }
    }
}