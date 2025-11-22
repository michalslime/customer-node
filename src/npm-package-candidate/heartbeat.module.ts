import { MiddlewareConsumer, Module, NestModule, DynamicModule } from '@nestjs/common';
import { HttpModule, HttpService } from '@nestjs/axios';
import { SystemHeartbeat } from './system-heartbeat';
import { FillCommonIdMiddleware } from './fill-common-id.middleware';
import { hashTo6Upper } from './utils';
import { ModuleRef } from '@nestjs/core';
import { FillMachineIdMiddleware } from './fill-machine-id.middleware';
import { FillMachineNameMiddleware } from './fill-machine-name.middleware';

export interface HeartbeatModuleOptions {
    applicationName: string;
    machineUrl: string;
    workspace: string;
}

@Module({
})
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
                        const machineId = opts.machineUrl ? hashTo6Upper(opts.machineUrl) : 'unknown-machine';
                        const applicationName = `${opts.applicationName}${process.env.NODE_ENV === 'development' ? '' : '-' + process.env.NODE_ENV}`;

                        return new SystemHeartbeat(http, applicationName, machineId, opts.machineUrl, opts.workspace);
                    }
                },
            ],
            exports: [SystemHeartbeat],
        };
    }

    configure(consumer: MiddlewareConsumer) {
        consumer.apply(FillCommonIdMiddleware).forRoutes('*');
        consumer.apply(FillMachineIdMiddleware).forRoutes('*');
        consumer.apply(FillMachineNameMiddleware).forRoutes("*");
    }
}
