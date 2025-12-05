import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { headers, SystemHeartbeat } from 'src/npm-package-candidate/system-heartbeat';

@Injectable()
export class OctopusService {
    private readonly apiUrl: string = trimTrailingSlash(process.env.OCTOPUS_URL || '');

    constructor(private readonly http: HttpService, private readonly systemHeartbeat: SystemHeartbeat) { }

    public async registerMe(commonId: string): Promise<boolean> {
        try {
            this.systemHeartbeat.logInfo(commonId, `Registering Customer: ${this.systemHeartbeat.machineId}`);

            const subscribedTo = (process.env.SUBSCRIBED_TO || '').split(',');

            const body = {
                url: this.systemHeartbeat.myPublicUrl,
                machineId: this.systemHeartbeat.machineId,
                nickname: process.env.CUSTOMER_NAME || 'NO NAME CUSTOMER',
                subscribedTo
            }

            await firstValueFrom(
                this.http.post(`${this.apiUrl}/customer/register`, body, headers().withCommonId(commonId).withHeartbeatPassword().build())
            );

            return true;
        } catch (error: any) {
            throw new Error(`Registering failed: ${error.message}`);
        }
    }
}
function trimTrailingSlash(arg0: string): string {
    throw new Error('Function not implemented.');
}

