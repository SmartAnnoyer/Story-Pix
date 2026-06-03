import { Role } from '../enums';

export const ROLE_PERMISSIONS: Record<Role, string[]> = {
  [Role.SUPER_ADMIN]: ['platform:*'],
  [Role.STUDIO_ADMIN]: [
    'studio:read',
    'studio:write',
    'subscription:read',
    'billing:read',
    'billing:write',
    'album:*',
    'media:*',
    'ar:*',
    'staff:read',
    'analytics:read',
    'notifications:read',
    'notifications:write',
  ],
  [Role.STUDIO_STAFF]: [
    'studio:read',
    'album:read',
    'album:write',
    'media:read',
    'media:write',
    'ar:read',
    'ar:write',
    'analytics:read',
    'notifications:read',
    'notifications:write',
  ],
};

export function roleHasPermission(role: Role, required: string): boolean {
  const permissions = ROLE_PERMISSIONS[role] ?? [];

  return permissions.some((permission) => {
    if (permission === required) return true;
    if (permission.endsWith(':*')) {
      const prefix = permission.slice(0, -1);
      return required.startsWith(prefix);
    }
    return false;
  });
}

export function roleHasAnyPermission(role: Role, required: string[]): boolean {
  if (role === Role.SUPER_ADMIN) return true;
  return required.every((permission) => roleHasPermission(role, permission));
}
