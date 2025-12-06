import { Inject, Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { BehaviorSubject, firstValueFrom, Observable } from 'rxjs';
import { Position } from 'src/models/position';
import { CommandsService } from 'src/npm-package-candidate/commands.service';
import { SystemHeartbeat } from 'src/npm-package-candidate/system-heartbeat';
import { OctopusService } from './octopus.service';
import { randomUUID } from 'crypto';
import { EXCHANGE_SERVICE, ExchangeService } from './exchange.service';


@Injectable()
export class InvestingService implements OnModuleInit, OnModuleDestroy {
    private positionsSubject = new BehaviorSubject<Position[]>([]);
    private intervalId: NodeJS.Timeout | null = null;

    public get positions$(): Observable<Position[]> {
        return this.positionsSubject.asObservable();
    }

    constructor(
        @Inject(EXCHANGE_SERVICE)
        private readonly exchange: ExchangeService,
        private systemHeartbeat: SystemHeartbeat,
        private octopusService: OctopusService
    ) { }

    onModuleInit() {
        this.startRefreshingPositions();

        const commonId = randomUUID().toString();
        this.octopusService.registerMe(commonId).catch((error) => this.systemHeartbeat.logError(commonId, 'Registering failed', error))
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

    public async fetchAndProcessCommands(commonId: string, commandsService: CommandsService): Promise<void> {
        const commands = await commandsService.getCommandsAsync(commonId);

        for (const command of commands) {
            this.systemHeartbeat.logInfo(commonId, `Processing command: ${command.type} for coin: ${command.coin}`, command);

            commandsService.lastFullfieldCommandTimestamp = command.createdTimestamp ?? Date.now();
            commandsService.lastFullfieldCommandTimestamp += 1;

            switch (command.type) {
                case 'SET_STOP_LOSS':
                    await this.exchange.setStopLossAsync(commonId, command.coin, command.payload);
                    break;
                case 'CLOSE_POSITION':
                    await this.exchange.closeWholePositionAsync(commonId, command.coin);
                    break;
                case 'OPEN_POSITION':
                    await this.exchange.newOrderAsync(commonId, command.coin, command.payload.percentage, command.payload.side, command.payload.leverage);
                    const price = await this.exchange.getPriceAsync(commonId, command.coin);

                    const stopLoss = command.payload.side === 'Buy' ? price * 0.96 : price * 1.04;
                    await this.exchange.setStopLossAsync(commonId, command.coin, stopLoss);
                    break;
                default:
                    this.systemHeartbeat.logWarn(commonId, `Unknown command type: ${command.type}`, command);
            }
        }
    }

    private startRefreshingPositions() {
        this.intervalId = setInterval(async () => {
            try {
                const positions = await this.exchange.getPositionInfoAsync('interal');
                this.positionsSubject.next(positions);
            } catch (error) {
                this.systemHeartbeat.logError('internal', 'Error refreshing positions', error);
                this.positionsSubject.next([]);
            }
        }, 3000);
    }
}
