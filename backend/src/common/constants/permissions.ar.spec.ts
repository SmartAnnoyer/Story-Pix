import { Role } from '../enums';
import { roleHasPermission } from '../constants/permissions.constants';

describe('AR permissions', () => {
  it('grants studio admin ar wildcard', () => {
    expect(roleHasPermission(Role.STUDIO_ADMIN, 'ar:read')).toBe(true);
    expect(roleHasPermission(Role.STUDIO_ADMIN, 'ar:write')).toBe(true);
  });

  it('grants studio staff explicit ar permissions', () => {
    expect(roleHasPermission(Role.STUDIO_STAFF, 'ar:read')).toBe(true);
    expect(roleHasPermission(Role.STUDIO_STAFF, 'ar:write')).toBe(true);
    expect(roleHasPermission(Role.STUDIO_STAFF, 'ar:delete')).toBe(false);
  });
});
