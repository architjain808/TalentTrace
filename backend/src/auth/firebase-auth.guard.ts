import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import * as admin from 'firebase-admin';

/**
 * FirebaseAuthGuard
 *
 * Validates the Firebase ID token sent in the Authorization header:
 *   Authorization: Bearer <firebase-id-token>
 *
 * On success, injects `req.user = { uid, email }` for downstream handlers.
 * Apply at controller or handler level with @UseGuards(FirebaseAuthGuard).
 */
@Injectable()
export class FirebaseAuthGuard implements CanActivate {
  private readonly logger = new Logger(FirebaseAuthGuard.name);

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const authHeader: string = req.headers['authorization'];

    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException(
        'Missing or malformed Authorization header. Expected: Bearer <Firebase ID token>',
      );
    }

    const idToken = authHeader.slice(7).trim();

    try {
      const decoded = await admin.auth().verifyIdToken(idToken);
      // Attach to request for use in controllers/services
      req.user = { uid: decoded.uid, email: decoded.email };
      return true;
    } catch (err) {
      this.logger.warn(`Token verification failed: ${err.message}`);
      throw new UnauthorizedException('Invalid or expired Firebase ID token.');
    }
  }
}
