import { HttpService } from "@nestjs/axios";
import { Injectable } from "@nestjs/common";
import { firstValueFrom } from "rxjs";
import { Command } from "src/models/command";
import { InvestingService } from "./investing.service";
import { BybitInvestingService } from "./bybit-investing.service";
import { ErrorCodes } from "src/others/error-codes.enum";

@Injectable()
export class CommandsService {
    private readonly apiUrl: string = process.env.OCTOPUS_URL || '';
    private lastFullfieldCommandTimestamp: number = Date.now();

    constructor(private readonly http: HttpService,
        private readonly investingService: InvestingService,
        private readonly bybitInvestingService: BybitInvestingService
    ) { }

    public async getCommandsAsync(): Promise<Command<any>[]> {
        try {
            const url = `${this.apiUrl}/investing/customer-commands/${this.lastFullfieldCommandTimestamp}`;
            console.log(`Fetching commands from URL: ${url}`);
            const response = await firstValueFrom(
                this.http.get<Command<any>[]>(url)
            );

            const commands = response.data;

            return commands.sort((a, b) => a.createdTimestamp - b.createdTimestamp);
        } catch (error: any) {
            throw new Error(`Failed to fetch commands: ${error.message}`);
        }
    }

    public async processFetchedCommandsAsync(commands: Command<any>[]): Promise<void> {
        for (const command of commands) {
            console.log(`Processing command: ${command.type} for coin: ${command.coin}`);
            this.lastFullfieldCommandTimestamp = command.createdTimestamp ?? Date.now();
            this.lastFullfieldCommandTimestamp += 1;
            
            switch (command.type) {
                case 'SET_STOP_LOSS':
                    await this.bybitInvestingService.setStopLossAsync(command.coin, command.payload);
                    break;
                case 'CLOSE_POSITION':
                    await this.bybitInvestingService.closeWholePositionAsync(command.coin);
                    break;
                case 'OPEN_POSITION':
                    await this.bybitInvestingService.newOrderAsync(command.coin, command.payload.percentage, command.payload.side, command.payload.leverage);
                    const price = await this.bybitInvestingService.getPriceAsync(command.coin);

                    const stopLoss = command.payload.side === 'Buy' ? price * 0.96 : price * 1.04;
                    await this.bybitInvestingService.setStopLossAsync(command.coin, stopLoss);
                    break;
                default:
                    console.warn(`Unknown command type: ${command.type}`);
            }
        }
    }
}