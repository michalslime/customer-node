import { HttpService } from "@nestjs/axios";
import { Injectable } from "@nestjs/common";
import { firstValueFrom } from "rxjs";
import { Command } from "src/models/command";
import { InvestingService } from "./investing.service";
import { BybitInvestingService } from "./bybit-investing.service";
import { ErrorCodes } from "src/others/error-codes.enum";
import { getHeaderWithCommonId, SystemHeartbeat } from "src/npm-package-candidate/system-heartbeat";

@Injectable()
export class CommandsService {
    private readonly apiUrl: string = process.env.OCTOPUS_URL || '';
    private lastFullfieldCommandTimestamp: number = Date.now();

    constructor(private readonly http: HttpService,
        private readonly investingService: InvestingService,
        private readonly bybitInvestingService: BybitInvestingService,
        private readonly systemHeartbeat: SystemHeartbeat
    ) { }

    public async getCommandsAsync(commonId: string): Promise<Command<any>[]> {
        try {
            this.systemHeartbeat.logInfo(commonId, 'Fetching commands from Octopus', { lastTimestamp: this.lastFullfieldCommandTimestamp });
            
            const url = `${this.apiUrl}/investing/customer-commands/${this.lastFullfieldCommandTimestamp}`;
            console.log(`Fetching commands from URL: ${url}`);
            const response = await firstValueFrom(
                this.http.get<Command<any>[]>(url, getHeaderWithCommonId(commonId))
            );

            const commands = response.data;
            const sortedCommands =  commands.sort((a, b) => a.createdTimestamp - b.createdTimestamp);

            this.systemHeartbeat.logInfo(commonId, `Fetched ${sortedCommands.length} commands from Octopus`, sortedCommands);

            return sortedCommands;
        } catch (error: any) {
            throw new Error(`Failed to fetch commands: ${error.message}`);
        }
    }

    public async processFetchedCommandsAsync(commands: Command<any>[], commonId: string): Promise<void> {
        for (const command of commands) {
            this.systemHeartbeat.logInfo(commonId, `Processing command: ${command.type} for coin: ${command.coin}`, command);

            this.lastFullfieldCommandTimestamp = command.createdTimestamp ?? Date.now();
            this.lastFullfieldCommandTimestamp += 1;
            
            switch (command.type) {
                case 'SET_STOP_LOSS':
                    await this.bybitInvestingService.setStopLossAsync(commonId, command.coin, command.payload);
                    break;
                case 'CLOSE_POSITION':
                    await this.bybitInvestingService.closeWholePositionAsync(commonId, command.coin);
                    break;
                case 'OPEN_POSITION':
                    await this.bybitInvestingService.newOrderAsync(commonId, command.coin, command.payload.percentage, command.payload.side, command.payload.leverage);
                    const price = await this.bybitInvestingService.getPriceAsync(commonId, command.coin);

                    const stopLoss = command.payload.side === 'Buy' ? price * 0.96 : price * 1.04;
                    await this.bybitInvestingService.setStopLossAsync(commonId, command.coin, stopLoss);
                    break;
                default:
                    this.systemHeartbeat.logWarn(commonId, `Unknown command type: ${command.type}`, command);
            }
        }
    }
}