import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../entities/user.entity';

export const ROLES_KEY = 'roles';

/** Roles autorizados para un handler/controlador (ver `RolesGuard`). */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
