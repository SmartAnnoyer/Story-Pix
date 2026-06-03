import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { RoleDefinition, RoleDocument } from './role.schema';
import { Role } from '../common/enums';

const DEFAULT_ROLES: Array<{ name: Role; label: string; permissions: string[] }> = [
  {
    name: Role.SUPER_ADMIN,
    label: 'Super Admin',
    permissions: ['platform:*'],
  },
  {
    name: Role.STUDIO_ADMIN,
    label: 'Studio Admin',
    permissions: ['studio:*'],
  },
  {
    name: Role.STUDIO_STAFF,
    label: 'Studio Staff',
    permissions: ['studio:read', 'album:read', 'album:write'],
  },
];

@Injectable()
export class RolesService implements OnModuleInit {
  constructor(
    @InjectModel(RoleDefinition.name)
    private readonly roleModel: Model<RoleDocument>,
  ) {}

  async onModuleInit() {
    await this.seedDefaultRoles();
  }

  findAll() {
    return this.roleModel.find({ isActive: true }).exec();
  }

  findByName(name: Role) {
    return this.roleModel.findOne({ name, isActive: true }).exec();
  }

  private async seedDefaultRoles() {
    for (const role of DEFAULT_ROLES) {
      await this.roleModel.updateOne(
        { name: role.name },
        { $setOnInsert: { ...role, isActive: true } },
        { upsert: true },
      );
    }
  }
}
