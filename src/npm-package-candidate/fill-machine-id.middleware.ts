import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { SystemHeartbeat } from './system-heartbeat';

@Injectable()
export class FillMachineIdMiddleware implements NestMiddleware {
    constructor(private readonly systemHeartbeat: SystemHeartbeat) {}

    use(req: Request & { commonId: string }, res: Response, next: NextFunction) {
        const xMachineId = req.headers['x-machine-id'];

        if (!xMachineId) {
            req.machineId = null;
        } else {
            req.machineId = xMachineId.toString();
        }

        next();
    }
}

