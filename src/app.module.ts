import { Module } from '@nestjs/common';
import { UserController } from './controllers/user';
import { DatabaseService } from './services/db';
import { AuthGuard } from './middlewares/auth.guard';
import { MachineController } from './controllers/machines';

@Module({
  imports: [],
  controllers: [UserController,MachineController],
  providers: [DatabaseService, {
    provide: 'APP_GUARD',
    useClass: AuthGuard
  }],
})
export class AppModule {
}
