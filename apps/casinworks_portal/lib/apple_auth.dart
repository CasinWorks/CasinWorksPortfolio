import 'dart:convert';
import 'dart:math';

import 'package:crypto/crypto.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/foundation.dart';
import 'package:sign_in_with_apple/sign_in_with_apple.dart';

bool get appleSignInSupported {
  if (kIsWeb) return false;
  return defaultTargetPlatform == TargetPlatform.iOS || defaultTargetPlatform == TargetPlatform.macOS;
}

bool userHasAppleProvider(User user) {
  return user.providerData.any((p) => p.providerId == 'apple.com');
}

String _randomNonce([int length = 32]) {
  const charset = '0123456789ABCDEFGHIJKLMNOPQRSTUVXYZabcdefghijklmnopqrstuvwxyz-._';
  final random = Random.secure();
  return List.generate(length, (_) => charset[random.nextInt(charset.length)]).join();
}

String _sha256ofString(String input) {
  final bytes = utf8.encode(input);
  return sha256.convert(bytes).toString();
}

/// Signs into Firebase with Apple. Does not create a Firestore profile.
Future<UserCredential> signInWithAppleFirebase() async {
  final rawNonce = _randomNonce();
  final nonce = _sha256ofString(rawNonce);

  final apple = await SignInWithApple.getAppleIDCredential(
    scopes: [
      AppleIDAuthorizationScopes.email,
      AppleIDAuthorizationScopes.fullName,
    ],
    nonce: nonce,
  );

  final idToken = apple.identityToken;
  if (idToken == null || idToken.isEmpty) {
    throw Exception('Apple did not return an identity token.');
  }

  final oauth = OAuthProvider('apple.com').credential(
    idToken: idToken,
    rawNonce: rawNonce,
    accessToken: apple.authorizationCode,
  );

  final cred = await FirebaseAuth.instance.signInWithCredential(oauth);

  final given = apple.givenName?.trim() ?? '';
  final family = apple.familyName?.trim() ?? '';
  final composed = '$given $family'.trim();
  if (composed.isNotEmpty && (cred.user?.displayName == null || cred.user!.displayName!.trim().isEmpty)) {
    await cred.user?.updateDisplayName(composed);
  }

  return cred;
}

/// Reauthenticates the current user with Apple (needed before account deletion).
Future<void> reauthenticateWithApple() async {
  final user = FirebaseAuth.instance.currentUser;
  if (user == null) throw Exception('Not signed in.');

  final rawNonce = _randomNonce();
  final nonce = _sha256ofString(rawNonce);

  final apple = await SignInWithApple.getAppleIDCredential(
    scopes: [
      AppleIDAuthorizationScopes.email,
      AppleIDAuthorizationScopes.fullName,
    ],
    nonce: nonce,
  );

  final idToken = apple.identityToken;
  if (idToken == null || idToken.isEmpty) {
    throw Exception('Apple did not return an identity token.');
  }

  final oauth = OAuthProvider('apple.com').credential(
    idToken: idToken,
    rawNonce: rawNonce,
    accessToken: apple.authorizationCode,
  );

  await user.reauthenticateWithCredential(oauth);
}
