import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// Sign-in details the user asked the app to keep.
class RememberedSignIn {
  const RememberedSignIn({required this.email, required this.password});
  final String email;
  final String password;
}

/// Stores the email and password behind "Remember me".
///
/// This goes to the iOS Keychain and to Android's AES-GCM backed storage, never
/// to shared preferences — those sit in a plain plist/XML that anyone with a
/// backup of the device can read.
class CredentialStore {
  const CredentialStore._();

  static const _storage = FlutterSecureStorage(
    iOptions: IOSOptions(accessibility: KeychainAccessibility.first_unlock_this_device),
  );

  static const _emailKey = 'portal.signin.email';
  static const _passwordKey = 'portal.signin.password';

  /// Null when nothing was saved, or when the platform has no secure store we
  /// can reach. A failure here must never block signing in by hand.
  static Future<RememberedSignIn?> read() async {
    try {
      final email = await _storage.read(key: _emailKey);
      final password = await _storage.read(key: _passwordKey);
      if (email == null || email.isEmpty) return null;
      if (password == null || password.isEmpty) return null;
      return RememberedSignIn(email: email, password: password);
    } catch (_) {
      return null;
    }
  }

  static Future<void> save({required String email, required String password}) async {
    try {
      await _storage.write(key: _emailKey, value: email);
      await _storage.write(key: _passwordKey, value: password);
    } catch (_) {}
  }

  static Future<void> clear() async {
    try {
      await _storage.delete(key: _emailKey);
      await _storage.delete(key: _passwordKey);
    } catch (_) {}
  }
}
