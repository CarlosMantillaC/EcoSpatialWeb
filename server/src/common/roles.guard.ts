import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from './roles.decorator';
import { UserRole } from '../entities/user.entity';

/**
 * Autorizacion por rol sobre `RequestUser.role` (viene del JWT).
 * Sin metadata `@Roles` cualquiera autenticado pasa; con ella, solo
 * los roles listados. La autenticacion la resuelve antes `JwtAuthGuard`.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!roles || roles.length === 0) return true;

    const request = context.switchToHttp().getRequest<{
      user?: { role?: UserRole };
    }>();
    const role = request.user?.role;
    if (!role || !roles.includes(role)) {
      throw new ForbiddenException(
        role === UserRole.ADMIN
          ? 'Tu rol Administrador solo gestiona flota, conductores, puntos de recogida y usuarios'
          : 'No tienes permiso para esta accion',
      );
    }
    return true;
  }
}
