import { MiddlewareConsumer, Module, NestModule, DynamicModule } from '@nestjs/common';
import { HttpModule, HttpService } from '@nestjs/axios';
import { SystemHeartbeat } from './system-heartbeat';
import { FillCommonIdMiddleware } from './fill-common-id.middleware';

export interface HeartbeatModuleOptions {
    applicationName: string;
    machineName: string;
}

@Module({})
export class HeartbeatModule implements NestModule {
    static forRoot(options: HeartbeatModuleOptions): DynamicModule {
        return {
            module: HeartbeatModule,
            imports: [HttpModule],
            providers: [
                {
                    provide: 'HEARTBEAT_OPTIONS',
                    useValue: options,
                },
                {
                    provide: SystemHeartbeat,
                    inject: [HttpService, 'HEARTBEAT_OPTIONS'],
                    useFactory: (http: HttpService, opts: HeartbeatModuleOptions) =>
                        new SystemHeartbeat(http, opts.applicationName, opts.machineName),
                },
            ],
            exports: [SystemHeartbeat],
        };
    }

    configure(consumer: MiddlewareConsumer) {
        consumer.apply(FillCommonIdMiddleware).forRoutes('*');
    }
}
