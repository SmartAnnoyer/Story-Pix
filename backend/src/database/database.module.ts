import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('database.uri'),
        autoIndex: configService.get<string>('app.nodeEnv') !== 'production',
        serverSelectionTimeoutMS: 10_000,
        connectTimeoutMS: 10_000,
      }),
    }),
  ],
})
export class DatabaseModule {}
