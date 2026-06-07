import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import {
  IStorageService,
  PresignedUploadResult,
  StorageObjectBody,
  StorageObjectMetadata,
} from './interfaces/storage.interface';

@Injectable()
export class R2StorageService extends IStorageService {
  private readonly logger = new Logger(R2StorageService.name);
  private readonly client: S3Client;
  private readonly bucketName: string;
  private readonly publicBaseUrl: string;
  private readonly presignExpiresSeconds: number;

  constructor(private readonly configService: ConfigService) {
    super();
    this.bucketName = this.configService.get<string>('storage.bucketName', 'storypix-dev');
    this.publicBaseUrl = this.configService.get<string>(
      'storage.publicBaseUrl',
      'https://media.story-pix.app',
    );
    this.presignExpiresSeconds = this.configService.get<number>(
      'storage.presignExpiresSeconds',
      900,
    );

    this.client = new S3Client({
      region: this.configService.get<string>('storage.region', 'auto'),
      endpoint: this.configService.get<string>('storage.endpoint'),
      credentials: {
        accessKeyId: this.configService.get<string>('storage.accessKeyId', ''),
        secretAccessKey: this.configService.get<string>('storage.secretAccessKey', ''),
      },
    });
  }

  async getPresignedUploadUrl(
    key: string,
    contentType: string,
    expiresInSeconds?: number,
    contentLengthBytes?: number,
  ): Promise<PresignedUploadResult> {
    const expiresIn = expiresInSeconds ?? this.presignExpiresSeconds;
    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      ContentType: contentType,
      ...(contentLengthBytes != null && contentLengthBytes > 0
        ? { ContentLength: contentLengthBytes }
        : {}),
    });

    const uploadUrl = await getSignedUrl(this.client, command, { expiresIn });

    return {
      uploadUrl,
      publicUrl: this.getPublicUrl(key),
      key,
      expiresIn,
    };
  }

  async deleteObject(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      }),
    );
  }

  getPublicUrl(key: string): string {
    return `${this.publicBaseUrl.replace(/\/$/, '')}/${key}`;
  }

  async getObjectMetadata(key: string): Promise<StorageObjectMetadata | null> {
    try {
      const response = await this.client.send(
        new HeadObjectCommand({
          Bucket: this.bucketName,
          Key: key,
        }),
      );

      return {
        key,
        sizeBytes: response.ContentLength ?? 0,
        contentType: response.ContentType ?? 'application/octet-stream',
      };
    } catch (error) {
      this.logger.warn(`Failed to head object ${key}: ${(error as Error).message}`);
      return null;
    }
  }

  async getObjectBuffer(key: string): Promise<StorageObjectBody | null> {
    try {
      const response = await this.client.send(
        new GetObjectCommand({
          Bucket: this.bucketName,
          Key: key,
        }),
      );

      if (!response.Body) {
        return null;
      }

      const bytes = await response.Body.transformToByteArray();

      return {
        buffer: Buffer.from(bytes),
        contentType: response.ContentType ?? 'image/jpeg',
      };
    } catch (error) {
      this.logger.warn(`Failed to get object ${key}: ${(error as Error).message}`);
      return null;
    }
  }

  async putObjectBuffer(
    key: string,
    buffer: Buffer,
    contentType: string,
  ): Promise<{ key: string; publicUrl: string }> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: buffer,
        ContentType: contentType,
        CacheControl: 'public, max-age=31536000, immutable',
      }),
    );

    return {
      key,
      publicUrl: this.getPublicUrl(key),
    };
  }
}
