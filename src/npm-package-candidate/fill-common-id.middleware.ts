import { Injectable, NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { systemHeartbeat } from './system-heartbeat';

@Injectable()
export class FillCommonIdMiddleware implements NestMiddleware {
    use(req: Request & { commonId: string }, res: Response, next: NextFunction) {
        const xCommonId = req.headers['x-common-id'];

        if (!xCommonId) {
            req.commonId = randomUUID().toString();
        } else {
            req.commonId = xCommonId.toString();
        }

        systemHeartbeat.logInfo(req.commonId, `Request received: ${req.method} ${req.originalUrl}`);

        next();
    }
}

