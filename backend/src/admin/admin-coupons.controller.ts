import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { RequirePermissions, Roles } from '../decorators';
import { Role } from '../common/enums';
import { CouponsService } from '../coupons/coupons.service';
import { CreateCouponDto, UpdateCouponDto } from '../coupons/dto/coupon.dto';

@Controller('admin/coupons')
@Roles(Role.SUPER_ADMIN)
@RequirePermissions('platform:plans:read')
export class AdminCouponsController {
  constructor(private readonly couponsService: CouponsService) {}

  @Get()
  findAll() {
    return this.couponsService.findAll();
  }

  @Post()
  @RequirePermissions('platform:plans:write')
  create(@Body() dto: CreateCouponDto) {
    return this.couponsService.create(dto);
  }

  @Patch(':id')
  @RequirePermissions('platform:plans:write')
  update(@Param('id') id: string, @Body() dto: UpdateCouponDto) {
    return this.couponsService.update(id, dto);
  }

  @Post(':id/activate')
  @RequirePermissions('platform:plans:write')
  activate(@Param('id') id: string) {
    return this.couponsService.setActive(id, true);
  }

  @Post(':id/deactivate')
  @RequirePermissions('platform:plans:write')
  deactivate(@Param('id') id: string) {
    return this.couponsService.setActive(id, false);
  }
}
