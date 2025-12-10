import { Module } from '@nestjs/common';
import { DatabaseService } from './services/db';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { AuthGuard } from './middlewares/auth.guard';
import { MachinesModule } from './modules/machines/machine.module';
import { MachineStreamModule } from './modules/machine_stream/machine_stream.module';
import { UsersModule } from './modules/users/users.module';
import { AssignmentsModule } from './modules/assignements/assignements.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    EventEmitterModule.forRoot(),
    MachinesModule,
    MachineStreamModule,
    UsersModule,
    AssignmentsModule,
  ],
  controllers: [],
  providers: [DatabaseService, {
    provide: 'APP_GUARD',
    useClass: AuthGuard
  }],
})
export class AppModule {
}
