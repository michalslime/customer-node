import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { BehaviorSubject, firstValueFrom, Observable, Subscription } from 'rxjs';
import { ActivePosition } from 'src/models/active-position';
import { ActiveStopLoss, PnlStopLoss } from 'src/models/active-stop-loss';
import { Coin, USDTCoin } from 'src/models/bybit-investing';
import { Position } from 'src/models/position';
import { BybitInvestingService } from 'src/services/bybit-investing.service';


@Injectable()
export class InvestingService implements OnModuleInit, OnModuleDestroy {
    private positionsSubject = new BehaviorSubject<Position[]>([]);
    private intervalId: NodeJS.Timeout | null = null;
    private activeSoftStopLosses: ActiveStopLoss[] = [];
    private activePnlStopLosses: PnlStopLoss[] = [];
    private checkActiveStopLossesSub: Subscription;

    public get positions$(): Observable<Position[]> {
        return this.positionsSubject.asObservable();
    }

    constructor(private bybitInvestingService: BybitInvestingService) {}

    onModuleInit() {
        this.startRefreshingPositions();
        this.subscribeToCheckActiveStopLosses();
    }

    onModuleDestroy() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
        }

        this.checkActiveStopLossesSub.unsubscribe();
    }

    public async getActivePositionsAsync(): Promise<ActivePosition[]> {
        const positions = await firstValueFrom(this.positions$);
        return positions.map((position) => {
            const matchingStopLoss = this.activeSoftStopLosses.find((sl) => sl.coin === position.coin);
            const matchingPnlStopLoss = this.activePnlStopLosses.find((sl) => sl.coin === position.coin);

            return { ...position, activeStopLoss: matchingStopLoss, pnlStopLoss: matchingPnlStopLoss?.value ?? undefined };
        });
    }

    private startRefreshingPositions() {
        this.intervalId = setInterval(async () => {
            const positions = await this.bybitInvestingService.getPositionInfoAsync();

            this.cleanNotMatchingStopLosses(positions);

            this.positionsSubject.next(positions);
        }, 3000);
    }

    private cleanNotMatchingStopLosses(positions: Position[]) {
        this.activeSoftStopLosses = this.activeSoftStopLosses.filter((stopLoss) => positions.some((position) => position.coin === stopLoss.coin));
        this.activePnlStopLosses = this.activePnlStopLosses.filter((stopLoss) => positions.some((position) => position.coin === stopLoss.coin));
    }

    private subscribeToCheckActiveStopLosses() {
        this.checkActiveStopLossesSub = this.positions$.subscribe((positions) => {
            positions.forEach(async (position) => {
                const symbol = position.symbol;
                const coin = symbol.replace(USDTCoin, '') as Coin; // Wyciągnięcie coina z symbolu

                let stopLossEntry = this.activeSoftStopLosses.find((sl) => sl.coin === coin);

                if (stopLossEntry) {
                    const isStopLossTriggered =
                        (position.side === 'Buy' && stopLossEntry.price >= position.price) ||
                        (position.side === 'Sell' && stopLossEntry.price <= position.price);

                    if (isStopLossTriggered && stopLossEntry.timestamp === 0) {
                        stopLossEntry.timestamp = Date.now(); // Uzupełniamy timestamp tylko, jeśli wynosi 0
                    }

                    // Jeśli stop loss jest przekroczony i minęło więcej niż 5 minut od pierwszego wykrycia
                    const timeSinceTriggered = Date.now() - stopLossEntry.timestamp;
                    if (isStopLossTriggered && stopLossEntry.timestamp > 0 && timeSinceTriggered > 300000) {
                        await this.closePositionAsync(coin);
                    }

                    if (!isStopLossTriggered) {
                        stopLossEntry.timestamp = 0;
                    }
                }

                let pnlStopLossEntry = this.activePnlStopLosses.find((sl) => sl.coin === coin);

                if (pnlStopLossEntry !== undefined && pnlStopLossEntry.value !== null && pnlStopLossEntry.value > position.pnl) {
                    await this.closePositionAsync(position.coin);
                }
            });
        });
    }

    public setSoftStopLoss(coin: Coin, value: number) {
        const existingStopLoss = this.activeSoftStopLosses.find((stopLoss) => stopLoss.coin === coin);

        if (existingStopLoss) {
            existingStopLoss.price = value;
            existingStopLoss.timestamp = 0;
        } else {
            this.activeSoftStopLosses.push({ coin, price: value, timestamp: 0 });
        }
    }

    public async setPnlStopLoss(coin: Coin, value: number | null) {
        const existingStopLoss = this.activePnlStopLosses.find((stopLoss) => stopLoss.coin === coin);

        if (existingStopLoss) {
            existingStopLoss.value = value;
        } else {
            this.activePnlStopLosses.push({ coin, value: value });
        }
    }

    public setHysteresisLoop(coin: Coin, stopLossPrice: number, reopenPrice: number) {

    }

    public removeSoftStopLoss(coin: Coin) {
        this.activeSoftStopLosses = this.activeSoftStopLosses.filter((stopLoss) => stopLoss.coin !== coin);
    }

    public async closePositionAsync(coin: Coin) {
        await this.bybitInvestingService.closeWholePositionAsync(coin);
        this.removeSoftStopLoss(coin);
    }
}
