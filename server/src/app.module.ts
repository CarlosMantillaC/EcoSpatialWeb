import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import configuration from './config/configuration';
import { AuthModule } from './modules/auth/auth.module';
import { DispatchModule } from './modules/dispatch/dispatch.module';
import { RoutingModule } from './modules/routing/routing.module';
import { SimulatorModule } from './modules/simulator/simulator.module';
import { UsersModule } from './modules/users/users.module';
import { VehiclesModule } from './modules/vehicles/vehicles.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: ['.env', '../.env'],
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const db = config.get('database');
        return {
          type: 'postgres',
          ...(db.url
            ? { url: db.url }
            : {
                host: db.host,
                port: db.port,
                username: db.user,
                password: db.password,
                database: db.name,
              }),
          autoLoadEntities: true,
          synchronize: config.get<string>('nodeEnv') !== 'production',
        };
      },
    }),
    ScheduleModule.forRoot(),
    AuthModule,
    UsersModule,
    VehiclesModule,
    RoutingModule,
    DispatchModule,
    SimulatorModule,
  ],
})
export class AppModule {}
