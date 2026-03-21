# TalentTrace Payment Backend

Secure NestJS backend that handles **Google Play purchase verification** and **Firestore quota crediting** for the TalentTrace mobile app.

## Architecture

```
App (react-native-iap)
  → Google Play Billing UI (payment)
  → Purchase succeeds → { purchaseToken, productId }

App → POST /iap/verify-purchase (with Firebase ID token)
  → NestJS verifies token (firebase-admin)
  → NestJS calls Google Play Developer API (googleapis)
  → Verifies purchase is legitimate & not already processed
  → Credits Firestore quota atomically
  → Acknowledges purchase (required within 3 days)
  → Stores immutable receipt for idempotency
```

## Setup

### 1. Install dependencies

```bash
cd backend
npm install
```

### 2. Get credentials

**Firebase Service Account:**
1. Go to Firebase Console → Project Settings → Service Accounts
2. Click "Generate new private key"
3. Save as `backend/service-account.json`

**Google Play Developer API Service Account:**
1. Go to Play Console → Setup → API Access
2. Link to a Google Cloud project (or create one)
3. Click "Create new service account" → grant **Financial data** + **Order management** permissions
4. Download the JSON key
5. Save as `backend/play-service-account.json`

### 3. Configure environment

```bash
cp .env.example .env
# Edit .env and fill in GOOGLE_PLAY_PACKAGE_NAME
```

### 4. Create products in Google Play Console

Go to Play Console → Your App → Monetization → Products → In-app products → Create:

| Product ID | Name | Price |
|---|---|---|
| `test_pack` | Test Pack (10 Credits) | ₹1 |
| `quota_starter_50` | Starter Pack (50 Credits) | ₹99 |
| `quota_pro_150` | Pro Pack (150 Credits) | ₹249 |
| `quota_growth_500` | Growth Pack (500 Credits) | ₹699 |

### 5. Run

```bash
npm run start:dev   # Development with hot reload
npm run build       # Build for production
npm start           # Run production build
```

## API Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/health` | None | Health check |
| `GET` | `/iap/products` | None | Get quota pack catalogue |
| `POST` | `/iap/verify-purchase` | Firebase token | Verify purchase + credit quota |

### POST /iap/verify-purchase

**Headers:** `Authorization: Bearer <Firebase ID Token>`

**Body:**
```json
{
  "purchaseToken": "...",
  "productId": "quota_starter_50"
}
```

**Response:**
```json
{
  "success": true,
  "creditsAdded": 50,
  "message": "50 credits added to your account."
}
```

## Tests

```bash
npm test          # Run unit tests
npm run test:cov  # With coverage
```

## Security

- All payment endpoints require a valid Firebase ID token
- Purchase tokens are verified server-side via Google Play Developer API
- Idempotency: duplicate `purchaseToken`s are rejected with 409
- Rate limiting: 100 req/15 min per IP
- Service account keys are excluded from git via `.gitignore`
