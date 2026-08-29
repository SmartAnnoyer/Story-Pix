import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IStorageService, PresignedUploadResult } from './interfaces/storage.interface';

/**
 * Placeholder storage service until Cloudflare R2 is configured.
 * Returns mock presigned URLs and public URLs for development.
 */
@Injectable()
export class MockStorageService extends IStorageService {
  constructor(private readonly configService: ConfigService) {
    super();
  }

  async getPresignedUploadUrl(
    key: string,
    contentType: string,
    expiresInSeconds = 900,
    _contentLengthBytes?: number,
  ): Promise<PresignedUploadResult> {
    const baseUrl = this.configService.get<string>('storage.publicBaseUrl', '');

    return {
      uploadUrl: `${baseUrl || 'https://example.invalid'}/mock-upload/${encodeURIComponent(key)}?contentType=${encodeURIComponent(contentType)}`,
      publicUrl: baseUrl ? `${baseUrl.replace(/\/$/, '')}/${key}` : key,
      key,
      expiresIn: expiresInSeconds,
    };
  }

  async deleteObject(_key: string): Promise<void> {
    // No-op until R2 integration
  }

  getPublicUrl(key: string): string {
    const baseUrl = this.configService.get<string>('storage.publicBaseUrl', '').replace(/\/$/, '');
    return baseUrl ? `${baseUrl}/${key}` : key;
  }

  async getObjectMetadata(
    _key: string,
  ): Promise<import('./interfaces/storage.interface').StorageObjectMetadata | null> {
    // Mock uploads do not write to object storage — skip HEAD size checks.
    return null;
  }

  async getObjectBuffer(
    _key: string,
  ): Promise<import('./interfaces/storage.interface').StorageObjectBody | null> {
    return null;
  }

  async getObjectStream(
    _key: string,
    _range?: { start: number; end: number },
  ): Promise<import('./interfaces/storage.interface').StorageObjectStream | null> {
    return null;
  }

  async putObjectBuffer(
    key: string,
    _buffer: Buffer,
    _contentType: string,
  ): Promise<{ key: string; publicUrl: string }> {
    return {
      key,
      publicUrl: this.getPublicUrl(key),
    };
  }
}
