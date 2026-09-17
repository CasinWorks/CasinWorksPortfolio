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
   - Domains: `auth.casinworks.com` and `casinworks-fb7ad.firebaseapp.com`.
   - Return URLs:
     - `https://auth.casinworks.com/__/auth/handler`
     - `https://casinworks-fb7ad.firebaseapp.com/__/auth/handler`
   - After changing Firebase `authDomain` to the custom domain, both must stay listed or web Apple sign-in fails.
3. Keys → create a key with **Sign In with Apple**, download the `.p8`, note Key ID and Team ID.

### Firebase Console
1. Authentication → Sign-in method → **Apple** → Enable.
2. Paste Services ID, Team ID, Key ID, and the `.p8` private key (web OAuth).
3. Native iOS uses the App ID capability; no Services ID is required for the Flutter iOS binary.

First-time Apple users land on a **complete profile** screen to pick client vs subcontractor before a Firestore `users/{uid}` document is created.

## Sign in with Google

Required for the web portal Google button and for Flutter on iOS and Android.

### Firebase Console
1. Authentication → Sign-in method → **Google** → Enable (set a support email).
2. Confirm authorized domains include `localhost`, `casinworks-fb7ad.firebaseapp.com`, and your production host.

### iOS
1. After enabling Google, re-download `GoogleService-Info.plist` from Project settings → Your apps → iOS app, and replace `ios/Runner/GoogleService-Info.plist`. It must include `CLIENT_ID` and `REVERSED_CLIENT_ID`.
2. In `ios/Runner/Info.plist`, add:
   - `GIDClientID` = value of `CLIENT_ID` from the plist
   - `CFBundleURLTypes` → `CFBundleURLSchemes` = value of `REVERSED_CLIENT_ID`

Example fragment:

```xml
<key>GIDClientID</key>
<string>YOUR_IOS_CLIENT_ID.apps.googleusercontent.com</string>
<key>CFBundleURLTypes</key>
<array>
  <dict>
    <key>CFBundleTypeRole</key>
    <string>Editor</string>
    <key>CFBundleURLSchemes</key>
    <array>
      <string>com.googleusercontent.apps.YOUR_REVERSED_CLIENT_ID</string>
    </array>
  </dict>
</array>
```

### Android
1. Firebase → Project settings → Add Android app with package `com.casinworks.casinworks_portal` (if missing).
2. Register **SHA-1** for debug (and release when you ship):

```bash
cd apps/casinworks_portal/android
./gradlew signingReport
```

3. Download `google-services.json` into `android/app/google-services.json`.
4. The Google Services Gradle plugin is declared in `android/settings.gradle.kts` and applied from `android/app/build.gradle.kts` **only when** that JSON file exists. The JSON must include a web OAuth client (`client_type: 3`) so native Google Sign-In can mint an ID token for Firebase.

### Web
No extra client secret is required in the Vite app. Firebase Auth handles the Google popup using the web app’s authorized domains.

First-time Google users use the same **complete profile** screen as Apple before a Firestore `users/{uid}` document is created.
