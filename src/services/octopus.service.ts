import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { headers, SystemHeartbeat } from 'src/npm-package-candidate/system-heartbeat';

@Injectable()
export class OctopusService {
    private readonly apiUrl: string = process.env.OCTOPUS_URL || '';

    constructor(private readonly http: HttpService, private readonly systemHeartbeat: SystemHeartbeat) { }

    public async registerMe(commonId: string): Promise<boolean> {
        try {
            this.systemHeartbeat.logInfo(commonId, `Registering Customer: ${this.systemHeartbeat.machineId}`);

            const subscribedTo = (process.env.SUBSCRIBED_TO || '').split(',');

            const body = {
                url: process.env.MY_PUBLIC_URL || '',
                machineId: this.systemHeartbeat.machineId,
                nickname: process.env.CUSTOMER_NAME || 'NO NAME CUSTOMER',
                subscribedTo
            }

            await firstValueFrom(
                this.http.post(`${this.apiUrl}/customers/register`, body, headers().withCommonId(commonId).withHeartbeatPassword().build())
            );

            return true;
        } catch (error: any) {
            throw new Error(`Registering failed: ${error.message}`);
        }
    }
}
