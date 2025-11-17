import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { BehaviorSubject, firstValueFrom, Observable } from 'rxjs';
import { Position } from 'src/models/position';
import { CommandsService } from 'src/npm-package-candidate/commands.service';
import { SystemHeartbeat } from 'src/npm-package-candidate/system-heartbeat';
import { BybitInvestingService } from 'src/services/bybit-investing.service';


@Injectable()
export class InvestingService implements OnModuleInit, OnModuleDestroy {
    private positionsSubject = new BehaviorSubject<Position[]>([]);
    private intervalId: NodeJS.Timeout | null = null;

    public get positions$(): Observable<Position[]> {
        return this.positionsSubject.asObservable();
    }

    constructor(private bybitInvestingService: BybitInvestingService, private systemHeartbeat: SystemHeartbeat) {}

    onModuleInit() {
        this.startRefreshingPositions();
    }

    onModuleDestroy() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
        }
    }

    public async getPositionsAsync(): Promise<Position[]> {
        const positions = await firstValueFrom(this.positions$);
        return positions;
    }

    public async fetchAndProcessCommand(commonId: string, commandsService: CommandsService): Promise<void> {
        const commands = await commandsService.getCommandsAsync(commonId);

        for (const command of commands) {
            this.systemHeartbeat.logInfo(commonId, `Processing command: ${command.type} for coin: ${command.coin}`, command);

            commandsService.lastFullfieldCommandTimestamp = command.createdTimestamp ?? Date.now();
            commandsService.lastFullfieldCommandTimestamp += 1;
            
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

    private startRefreshingPositions() {
        this.intervalId = setInterval(async () => {
            const positions = await this.bybitInvestingService.getPositionInfoAsync('interal');

            this.positionsSubject.next(positions);
        }, 3000);
    }
}
