import { HttpService } from "@nestjs/axios";
import { firstValueFrom } from "rxjs";
import { Command, CommandType } from "src/npm-package-candidate/command";
import { headers, SystemHeartbeat } from "src/npm-package-candidate/system-heartbeat";

export class CommandsService {
    public lastFullfieldCommandTimestamp: number = Date.now();

    constructor(
        public readonly machineName: string,
        private readonly source: string,
        private readonly sourceUrl,
        private readonly http: HttpService,
        private readonly systemHeartbeat: SystemHeartbeat
    ) { }

    public async getCommandsAsync(commonId: string): Promise<Command<any>[]> {
        try {
            this.systemHeartbeat.logWarn(commonId, 'Timestamp at fetching', this.lastFullfieldCommandTimestamp);
            const url = `${this.sourceUrl}/${this.lastFullfieldCommandTimestamp}`;

            this.systemHeartbeat.logInfo(commonId, `Fetching commands from ${this.source}`, { url });

            const response = await firstValueFrom(
                this.http.get<Command<any>[]>(
                    url,
                    headers()
                        .withCommonId(commonId)
                        .withMachineId(this.systemHeartbeat.machineId)
                        .build()
                )
            );

            const apiCommands = response.data ?? [];

            const sorted = apiCommands.sort((a, b) => a.createdTimestamp - b.createdTimestamp);

            this.systemHeartbeat.logInfo(
                commonId,
                `Fetched ${apiCommands.length} API commands from ${this.source}`,
                sorted
            );

            return sorted;
        } catch (error: any) {
            throw new Error(`Failed to fetch commands: ${error.message}`);
        }
    }
}