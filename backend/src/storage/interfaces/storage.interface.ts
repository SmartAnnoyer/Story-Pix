export interface PresignedUploadResult {
  uploadUrl: string;
  publicUrl: string;
  key: string;
  expiresIn: number;
}

export interface StorageObjectMetadata {
  key: string;
  sizeBytes: number;
  contentType: string;
}

export interface StorageObjectBody {
  buffer: Buffer;
  contentType: string;
}

export abstract class IStorageService {
  abstract getPresignedUploadUrl(
    key: string,
    contentType: string,
    expiresInSeconds?: number,
    contentLengthBytes?: number,
  ): Promise<PresignedUploadResult>;

  abstract deleteObject(key: string): Promise<void>;

  abstract getPublicUrl(key: string): string;

  abstract getObjectMetadata(key: string): Promise<StorageObjectMetadata | null>;

  abstract getObjectBuffer(key: string): Promise<StorageObjectBody | null>;
}

export const STORAGE_SERVICE = Symbol('STORAGE_SERVICE');
