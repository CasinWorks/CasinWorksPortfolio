import 'dart:async';

import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';

/// Registers this device for push and reports taps back to the app.
///
/// Everything here is best-effort. A user who denies notifications, or a
/// simulator with no APNs token, must still get a fully working portal — so no
/// failure in this file is ever surfaced or rethrown.
class PushService {
  PushService._();

  static final instance = PushService._();

  /// Thread id from the notification the user tapped, waiting to be opened.
  final pendingThreadId = ValueNotifier<String?>(null);

  String? _uid;
  String? _token;
  StreamSubscription<String>? _refreshSub;
  StreamSubscription<RemoteMessage>? _openedSub;
  bool _started = false;

  /// Call once the user is signed in. Safe to call again on the same uid.
  Future<void> start(String uid) async {
    if (_uid == uid && _started) return;
    _uid = uid;
    _started = true;

    try {
      final messaging = FirebaseMessaging.instance;

      // iOS shows the system prompt here; Android 13+ needs it too.
      await messaging.requestPermission(alert: true, badge: true, sound: true);

      // Without this, iOS gives no token until APNs has registered the device,
      // and the very first read after a fresh install races that.
      if (defaultTargetPlatform == TargetPlatform.iOS) {
        final apns = await messaging.getAPNSToken();
        if (apns == null) {
          await Future<void>.delayed(const Duration(seconds: 2));
        }
      }

      final token = await messaging.getToken();
      if (token != null) await _saveToken(uid, token);

      await _refreshSub?.cancel();
      _refreshSub = messaging.onTokenRefresh.listen((next) {
        final current = _uid;
        if (current != null) _saveToken(current, next);
      });

      // Tapped while the app was in the background.
      await _openedSub?.cancel();
      _openedSub = FirebaseMessaging.onMessageOpenedApp.listen(_handleOpen);

      // Tapped while the app was not running at all.
      final initial = await messaging.getInitialMessage();
      if (initial != null) _handleOpen(initial);
    } catch (_) {
      // Push is a convenience; the portal works without it.
    }
  }

  void _handleOpen(RemoteMessage message) {
    final threadId = message.data['threadId'];
    if (threadId is String && threadId.isNotEmpty) {
      pendingThreadId.value = threadId;
    }
  }

  Future<void> _saveToken(String uid, String token) async {
    _token = token;
    try {
      final ref = FirebaseFirestore.instance.collection('users').doc(uid);
      final snap = await ref.get();
      if (!snap.exists) return;
      final current = ((snap.data()?['fcmTokens'] as List<dynamic>?) ?? const [])
          .whereType<String>()
          .toList();
      if (current.contains(token)) return;
      // Capped so someone cycling devices cannot grow the document unbounded.
      final next = [...current, token];
      await ref.update({
        'fcmTokens': next.length > 10 ? next.sublist(next.length - 10) : next,
      });
    } catch (_) {}
  }

  /// Drops this device's token so a signed-out phone stops receiving messages.
  Future<void> stop() async {
    final uid = _uid;
    final token = _token;
    await _refreshSub?.cancel();
    await _openedSub?.cancel();
    _refreshSub = null;
    _openedSub = null;
    _uid = null;
    _token = null;
    _started = false;

    if (uid == null || token == null) return;
    try {
      final ref = FirebaseFirestore.instance.collection('users').doc(uid);
      final snap = await ref.get();
      if (!snap.exists) return;
      final current = ((snap.data()?['fcmTokens'] as List<dynamic>?) ?? const [])
          .whereType<String>()
          .toList();
      if (!current.contains(token)) return;
      await ref.update({'fcmTokens': current.where((t) => t != token).toList()});
    } catch (_) {}
  }
}
