import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RolesService } from './roles.service';
import { RoleDefinition, RoleSchema } from './role.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: RoleDefinition.name, schema: RoleSchema }]),
  ],
  providers: [RolesService],
  exports: [RolesService],
})
export class RolesModule {}
