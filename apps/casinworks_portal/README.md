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
