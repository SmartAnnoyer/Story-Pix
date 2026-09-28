import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { CurrentUser, RequirePermissions, Roles } from '../decorators';
import { Role } from '../common/enums';
import type { AuthenticatedUser } from '../common/interfaces';
import { PacksService } from '../packs/packs.service';
import { AlbumsService } from '../albums/albums.service';
import {
  AssignPackDto,
  CreateAlbumPackDto,
  QueryPackLedgerDto,
  UpdateAlbumPackDto,
} from '../packs/dto/pack.dto';
import { TopUpAlbumScansDto } from '../packs/dto/top-up-scans.dto';

@Controller('admin/packs')
@Roles(Role.SUPER_ADMIN)
@RequirePermissions('platform:plans:read')
export class AdminPacksController {
  constructor(
    private readonly packsService: PacksService,
    private readonly albumsService: AlbumsService,
  ) {}

  @Get()
  findAll() {
    return this.packsService.findAll(true);
  }

  @Get('ledger')
  ledger(@Query() query: QueryPackLedgerDto) {
    return this.packsService.listLedger(query);
  }

  @Get('studios/:studioId/credits')
  studioCredits(@Param('studioId') studioId: string) {
    return this.packsService.getStudioPackSummary(studioId);
  }

  @Post('assign')
  @RequirePermissions('platform:plans:write')
  assign(@Body() dto: AssignPackDto, @CurrentUser() user: AuthenticatedUser) {
    return this.packsService.assignToStudio(dto, user.userId);
  }

  @Get('studios/:studioId/scan-usage')
  studioScanUsage(@Param('studioId') studioId: string) {
    return this.albumsService.getScanUsageOverview(studioId);
  }

  @Post('top-up-scans')
  @RequirePermissions('platform:plans:write')
  async topUpScans(@Body() dto: TopUpAlbumScansDto, @CurrentUser() user: AuthenticatedUser) {
    const result = await this.albumsService.renewMappingScans({
      albumId: dto.albumId,
      additionalScans: dto.additionalScans,
      arTargetIds: dto.arTargetIds,
    });
    await this.packsService.recordScanRenewal({
      studioId: result.album.studioId,
      albumId: result.album.id,
      albumName: result.album.albumName,
      photoCount: result.renewedCount,
      scansPerPhoto: dto.additionalScans,
      unitPriceInr: 0,
      totalPriceInr: 0,
      performedBy: user.userId,
      notes: dto.notes?.trim() || 'Complimentary renewal by super admin',
    });
    return result;
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.packsService.findById(id);
  }

  @Post()
  @RequirePermissions('platform:plans:write')
  create(@Body() dto: CreateAlbumPackDto) {
    return this.packsService.create(dto);
  }

  @Patch(':id')
  @RequirePermissions('platform:plans:write')
  update(@Param('id') id: string, @Body() dto: UpdateAlbumPackDto) {
    return this.packsService.update(id, dto);
  }

  @Post(':id/activate')
  @RequirePermissions('platform:plans:write')
  activate(@Param('id') id: string) {
    return this.packsService.setActive(id, true);
  }

  @Post(':id/deactivate')
  @RequirePermissions('platform:plans:write')
  deactivate(@Param('id') id: string) {
    return this.packsService.setActive(id, false);
  }
}
