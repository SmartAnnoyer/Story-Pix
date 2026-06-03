import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { IStorageService, STORAGE_SERVICE } from './interfaces/storage.interface';
import { MockStorageService } from './storage.service';
import { R2StorageService } from './r2-storage.service';

@Module({
  imports: [ConfigModule],
  providers: [
    MockStorageService,
    R2StorageService,
    {
      provide: STORAGE_SERVICE,
      inject: [ConfigService, MockStorageService, R2StorageService],
      useFactory: (
        configService: ConfigService,
        mockStorage: MockStorageService,
        r2Storage: R2StorageService,
      ): IStorageService => {
        return configService.get<boolean>('storage.useR2') ? r2Storage : mockStorage;
      },
    },
  ],
  exports: [STORAGE_SERVICE],
})
export class StorageModule {}
