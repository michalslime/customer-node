import { Injectable, NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { SystemHeartbeat } from './system-heartbeat';

@Injectable()
export class FillCommonIdMiddleware implements NestMiddleware {
    constructor(private readonly systemHeartbeat: SystemHeartbeat) {}

    use(req: Request & { commonId: string }, res: Response, next: NextFunction) {
        const xCommonId = req.headers['x-common-id'];

        if (!xCommonId) {
            req.commonId = randomUUID().toString();
        } else {
            req.commonId = xCommonId.toString();
        }

        this.systemHeartbeat.logInfo(req.commonId, `Request received: ${req.method} ${req.originalUrl}`, req.method === 'POST' ? req.body : null);

        next();
    }
}

