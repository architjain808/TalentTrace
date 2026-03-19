import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { FirebaseAdminModule } from './firebase/firebase-admin.module';
import { AuthModule } from './auth/auth.module';
import { IapModule } from './iap/iap.module';
import { HealthController } from './health.controller';

@Module({
  imports: [
    // ConfigModule is global — all modules can inject ConfigService
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // Firebase Admin (Firestore + Auth) — global, exported for other modules
    FirebaseAdminModule,

    // Auth utilities (guard, token verification)
    AuthModule,

    // In-App Purchase module (Google Play Billing)
    IapModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
