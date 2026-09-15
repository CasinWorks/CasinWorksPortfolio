# CasinWorks Portal (Flutter)

iOS and Android client for the same Firebase project as `https://www.casinworks.com/portal`.

## Setup

```bash
cd apps/casinworks_portal
dart pub get
flutterfire configure   # pick the CasinFreight / CasinWorks Firebase project
flutter run
```

Replace the placeholder `firebaseOptions` in `lib/main.dart` with the generated `firebase_options.dart` from FlutterFire, or pass `--dart-define` keys at build time.

Pay invoice uses `url_launcher` (external browser). There is no in-app checkout.

## Sign in with Apple

Required before TestFlight / App Store builds that use the Apple button.

### Apple Developer
1. Certificates, Identifiers & Profiles → **Identifiers** → App ID `com.casinworks.casinworksPortal` → enable **Sign In with Apple**.
2. For the **web** portal, create a **Services ID** (e.g. `com.casinworks.casinworksPortal.web`):
   - Enable Sign In with Apple → Configure.
   - Domains: `casinworks-fb7ad.firebaseapp.com` (and `www.casinworks.com` if you add custom handlers later).
   - Return URL: `https://casinworks-fb7ad.firebaseapp.com/__/auth/handler`
3. Keys → create a key with **Sign In with Apple**, download the `.p8`, note Key ID and Team ID.

### Firebase Console
1. Authentication → Sign-in method → **Apple** → Enable.
2. Paste Services ID, Team ID, Key ID, and the `.p8` private key (web OAuth).
3. Native iOS uses the App ID capability; no Services ID is required for the Flutter iOS binary.

First-time Apple users land on a **complete profile** screen to pick client vs subcontractor before a Firestore `users/{uid}` document is created.
