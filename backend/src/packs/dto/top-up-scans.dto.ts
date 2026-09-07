import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsString, Min } from 'class-validator';

export class TopUpAlbumScansDto {
  @IsString()
  @IsNotEmpty()
  albumId!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  additionalScans!: number;
}
