import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  app.setGlobalPrefix('api');
  app.enableCors({
    origin: [
      config.get<string>('webauthn.origin')!,
      'http://localhost:5173',
      'http://127.0.0.1:5173',
    ],
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Documentacion OpenAPI (UI en /api/docs, JSON en /api/docs-json).
  // Se puede desactivar con SWAGGER_ENABLED=false.
  if (config.get<boolean>('swagger.enabled')) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('EcoSpatial API')
      .setDescription(
        'API de despacho de flota: autenticacion sin contrasena (WebAuthn), ' +
          'flota, sucursales, ordenes de servicio y despachos de dos tramos. ' +
          'La mayoria de endpoints exige el JWT emitido por /auth/login/verify ' +
          'y algunos estan restringidos por rol (administrador u operadora).',
      )
      .setVersion('1.0.0')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description:
            'JWT de la sesion ( Authorization: Bearer <token> ). Se obtiene en /auth/login/verify o /auth/dev/login.',
        },
        'bearer',
      )
      .addTag('auth', 'Registro y acceso WebAuthn (sin contrasena) + JWT')
      .addTag('vehicles', 'Flota: lectura autenticada, escritura solo admin')
      .addTag('drivers', 'Conductores: lectura autenticada, escritura solo admin')
      .addTag('pickup-points', 'Sucursales: lectura autenticada, escritura solo admin')
      .addTag('users', 'Usuarios y roles (solo administrador)')
      .addTag('orders', 'Ordenes de servicio (operacion de la operadora)')
      .addTag('dispatch', 'Despachos de dos tramos (operacion de la operadora)')
      .addTag('events', 'Stream SSE de flota en tiempo real')
      .addTag('alerts', 'Alertas de geocerca, velocidad y llegada')
      .addTag('reports', 'KPIs y exportacion CSV')
      .addTag('audit', 'Bitacora de acciones sobre el negocio')
      .addTag('geocode', 'Geocodificacion (Nominatim) dentro de Cucuta')
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('docs', app, document, {
      useGlobalPrefix: true,
      customSiteTitle: 'EcoSpatial API',
      // Recordar la autorizacion entre recargas de la UI.
      swaggerOptions: { persistAuthorization: true },
    });
  }

  const port = config.get<number>('port') ?? 3000;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`EcoSpatial API escuchando en http://localhost:${port}/api`);
}

void bootstrap();
