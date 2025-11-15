import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { BehaviorSubject, firstValueFrom, Observable } from 'rxjs';
import { Position } from 'src/models/position';
import { BybitInvestingService } from 'src/services/bybit-investing.service';


@Injectable()
export class InvestingService implements OnModuleInit, OnModuleDestroy {
    private positionsSubject = new BehaviorSubject<Position[]>([]);
    private intervalId: NodeJS.Timeout | null = null;

    public get positions$(): Observable<Position[]> {
        return this.positionsSubject.asObservable();
    }

    constructor(private bybitInvestingService: BybitInvestingService) {}

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

    private startRefreshingPositions() {
        this.intervalId = setInterval(async () => {
            const positions = await this.bybitInvestingService.getPositionInfoAsync('interal');

            this.positionsSubject.next(positions);
        }, 3000);
    }
}
