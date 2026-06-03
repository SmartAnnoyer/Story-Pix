export enum Role {
  SUPER_ADMIN = 'super_admin',
  STUDIO_ADMIN = 'studio_admin',
  STUDIO_STAFF = 'studio_staff',
}

export const ROLE_HIERARCHY: Record<Role, number> = {
  [Role.SUPER_ADMIN]: 100,
  [Role.STUDIO_ADMIN]: 50,
  [Role.STUDIO_STAFF]: 10,
};
