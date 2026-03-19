import { Module, Global, OnApplicationBootstrap, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';
import { FirestoreService } from './firestore.service';

/**
 * Global module — initializes firebase-admin once and exports FirestoreService.
 * Mark @Global() so every module can inject FirestoreService without re-importing.
 */
@Global()
@Module({
  providers: [
    {
      provide: 'FIREBASE_ADMIN',
      useFactory: (config: ConfigService) => {
        const serviceAccountPath = config.get<string>(
          'FIREBASE_SERVICE_ACCOUNT_PATH',
          './service-account.json',
        );

        // Avoid double-initialisation during hot reload
        if (admin.apps.length > 0) {
          return admin.app();
        }

        const serviceAccount = require(
          require('path').resolve(process.cwd(), serviceAccountPath),
        );

        return admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
        });
      },
      inject: [ConfigService],
    },
    FirestoreService,
  ],
  exports: ['FIREBASE_ADMIN', FirestoreService],
})
export class FirebaseAdminModule implements OnApplicationBootstrap {
  private readonly logger = new Logger(FirebaseAdminModule.name);

  onApplicationBootstrap() {
    this.logger.log('Firebase Admin SDK initialised ✓');
  }
}
