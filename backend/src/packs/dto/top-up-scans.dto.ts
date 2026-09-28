import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class TopUpAlbumScansDto {
  @IsString()
  @IsNotEmpty()
  albumId!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100000)
  additionalScans!: number;

  /** Specific photos to renew; omit or leave empty for every live photo in the album. */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(500)
  @IsMongoId({ each: true })
  arTargetIds?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
