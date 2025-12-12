import { Inject, Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { BehaviorSubject, firstValueFrom, Observable } from 'rxjs';
import { CommandsService } from 'src/npm-package-candidate/commands.service';
import { SystemHeartbeat } from 'src/npm-package-candidate/system-heartbeat';
import { OctopusService } from './octopus.service';
import { randomUUID } from 'crypto';
import { EXCHANGE_SERVICE, ExchangeService } from '../npm-package-exchanges/exchange.service';
import { retryInvokesAsync } from 'src/npm-package-candidate/utils/retry-invokes';
import { Position } from 'src/npm-package-base/models';


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

                    retryInvokesAsync({
                        task: async () => {
                            const positions = await this.exchange.getPositionInfoAsync(commonId);

                            if (positions.findIndex(x => x.coin === command.coin) < -1) {
                                const stopLoss = command.payload.stopLoss;
                                console.log(stopLoss);
                                this.exchange.setStopLossAsync(commonId, command.coin, stopLoss).catch((error) => {
                                    this.systemHeartbeat.logError(commonId, `Setting SL failed for ${command.coin} at ${stopLoss}`, error);
                                });
                            } else {
                                console.log('Position not created yet');
                                throw new Error('Position not created yet')
                            }
                        },
                        initialInterval: 3000,
                        multiplier: 1.5,
                        retries: 3
                    }).catch((error) => {
                        this.systemHeartbeat.logError(commonId, `Setting SL failed for ${command.coin} after few attempts`, error);
                    });

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
