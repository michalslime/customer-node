import { MiddlewareConsumer, Module, NestModule, DynamicModule } from '@nestjs/common';
import { HttpModule, HttpService } from '@nestjs/axios';
import { SystemHeartbeat } from './system-heartbeat';
import { FillCommonIdMiddleware } from './fill-common-id.middleware';
import { hashTo6Upper } from './utils';

export interface HeartbeatModuleOptions {
    applicationName: string;
    machineUrl: string;
}

@Module({})
export class HeartbeatModule implements NestModule {
    static forRoot(options: HeartbeatModuleOptions): DynamicModule {
        return {
            module: HeartbeatModule,
            imports: [HttpModule],
            global: true,
            providers: [
                {
                    provide: 'HEARTBEAT_OPTIONS',
                    useValue: options,
                },
                {
                    provide: SystemHeartbeat,
                    inject: [HttpService, 'HEARTBEAT_OPTIONS'],
                    useFactory: (http: HttpService, opts: HeartbeatModuleOptions) => {
                        const machineName = opts.machineUrl ? hashTo6Upper(opts.machineUrl) : 'unknown-machine';
                        const applicationName = `${opts.applicationName}${process.env.NODE_ENV === 'development' ? '' : '-' + process.env.NODE_ENV}`;

                        return new SystemHeartbeat(http, applicationName, machineName);
                    }
                },
            ],
            exports: [SystemHeartbeat],
        };
    }

    configure(consumer: MiddlewareConsumer) {
        consumer.apply(FillCommonIdMiddleware).forRoutes('*');
    }
}
