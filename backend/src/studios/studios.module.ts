import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersModule } from '../users/users.module';
import { StorageModule } from '../storage/storage.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { Studio, StudioSchema } from './schemas/studio.schema';
import { StudiosService } from './studios.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Studio.name, schema: StudioSchema }]),
    UsersModule,
    StorageModule,
    forwardRef(() => SubscriptionsModule),
    forwardRef(() => NotificationsModule),
  ],
  providers: [StudiosService],
  exports: [StudiosService, MongooseModule],
})
export class StudiosModule {}
