import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { SystemHeartbeat } from './system-heartbeat';

@Injectable()
export class FillMachineNameMiddleware implements NestMiddleware {
    constructor(private readonly systemHeartbeat: SystemHeartbeat) {}

    use(req: Request & { commonId: string }, res: Response, next: NextFunction) {
        const xMachineName = req.headers['x-machine-name'];

        if (!xMachineName) {
            req.machineName = null;
        } else {
            req.machineName = xMachineName.toString();
        }

        next();
    }
}

