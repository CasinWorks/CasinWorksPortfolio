import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/foundation.dart';
import 'package:google_sign_in/google_sign_in.dart';

bool get googleSignInSupported {
  if (kIsWeb) return false;
  return defaultTargetPlatform == TargetPlatform.iOS ||
      defaultTargetPlatform == TargetPlatform.android ||
      defaultTargetPlatform == TargetPlatform.macOS;
}

bool userHasGoogleProvider(User user) {
  return user.providerData.any((p) => p.providerId == 'google.com');
}

bool _googleSignInReady = false;

Future<void> _ensureGoogleSignInInitialized() async {
  if (_googleSignInReady) return;
  await GoogleSignIn.instance.initialize();
  _googleSignInReady = true;
}

/// Signs into Firebase with Google. Does not create a Firestore profile.
Future<UserCredential> signInWithGoogleFirebase() async {
  await _ensureGoogleSignInInitialized();

  final account = await GoogleSignIn.instance.authenticate();
  final idToken = account.authentication.idToken;
  if (idToken == null || idToken.isEmpty) {
    throw Exception('Google did not return an identity token.');
  }

  final credential = GoogleAuthProvider.credential(idToken: idToken);
  return FirebaseAuth.instance.signInWithCredential(credential);
}

/// Reauthenticates the current user with Google (needed before account deletion).
Future<void> reauthenticateWithGoogle() async {
  final user = FirebaseAuth.instance.currentUser;
  if (user == null) throw Exception('Not signed in.');

  await _ensureGoogleSignInInitialized();

  final account = await GoogleSignIn.instance.authenticate();
  final idToken = account.authentication.idToken;
  if (idToken == null || idToken.isEmpty) {
    throw Exception('Google did not return an identity token.');
  }

  final credential = GoogleAuthProvider.credential(idToken: idToken);
  await user.reauthenticateWithCredential(credential);
}
