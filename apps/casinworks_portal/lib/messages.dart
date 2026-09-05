import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import 'theme.dart';
import 'widgets.dart';

/// Longest message the security rules will accept.
const messageMaxLength = 4000;

/// Thread ids are derived from what the thread is about, so both sides land in
/// the same document no matter who writes first. Mirrors api.ts.
String threadIdForClient(String uid) => 'c_$uid';
String threadIdForProject(String projectId) => 'p_$projectId';

/// A conversation between one client and the studio.
class MessageThread {
  const MessageThread({
    required this.id,
    required this.clientUid,
    required this.clientEmail,
    required this.clientName,
    required this.subject,
    required this.projectName,
    required this.lastMessageAt,
    required this.lastMessagePreview,
    required this.lastMessageBy,
    required this.adminReadAt,
    required this.clientReadAt,
  });

  factory MessageThread.fromDoc(QueryDocumentSnapshot<Map<String, dynamic>> doc) {
    return MessageThread.fromMap(doc.id, doc.data());
  }

  factory MessageThread.fromMap(String id, Map<String, dynamic> data) {
    return MessageThread(
      id: id,
      clientUid: (data['clientUid'] ?? '') as String,
      clientEmail: (data['clientEmail'] ?? '') as String,
      clientName: (data['clientName'] ?? '') as String,
      subject: (data['subject'] ?? 'Messages') as String,
      projectName: (data['projectName'] ?? '') as String,
      lastMessageAt: (data['lastMessageAt'] ?? '') as String,
      lastMessagePreview: (data['lastMessagePreview'] ?? '') as String,
      lastMessageBy: (data['lastMessageBy'] ?? 'client') as String,
      adminReadAt: (data['adminReadAt'] ?? '') as String,
      clientReadAt: (data['clientReadAt'] ?? '') as String,
    );
  }

  final String id;
  final String clientUid;
  final String clientEmail;
  final String clientName;
  final String subject;
  final String projectName;
  final String lastMessageAt;
  final String lastMessagePreview;
  final String lastMessageBy;
  final String adminReadAt;
  final String clientReadAt;

  String get title => projectName.isNotEmpty ? projectName : subject;

  /// True when the other side has spoken since [viewer] last opened this.
  bool hasUnreadFor(String viewer) {
    if (lastMessageAt.isEmpty) return false;
    if (lastMessageBy == viewer) return false;
    final readAt = viewer == 'admin' ? adminReadAt : clientReadAt;
    return readAt.isEmpty || readAt.compareTo(lastMessageAt) < 0;
  }
}

/// 'admin' or 'client'. Subcontractors write as clients so the studio still
/// sees who is asking.
String viewerAuthorFor(PortalSession session) => session.isAdmin ? 'admin' : 'client';

CollectionReference<Map<String, dynamic>> _threads() =>
    FirebaseFirestore.instance.collection('threads');

/// Admins watch every thread; everyone else watches their own by email, which
/// also finds threads the studio opened before they had registered.
Stream<List<MessageThread>> threadsStream(PortalSession session) {
  final query = session.isAdmin
      ? _threads()
      : _threads().where('clientEmail', isEqualTo: session.email.trim().toLowerCase());
  return query.snapshots().map((snap) {
    final rows = snap.docs.map(MessageThread.fromDoc).toList()
      ..sort((a, b) => b.lastMessageAt.compareTo(a.lastMessageAt));
    return rows;
  });
}

/// Number of conversations waiting on [session], for the menu badge.
Stream<int> unreadThreadCountStream(PortalSession session) {
  final viewer = viewerAuthorFor(session);
  return threadsStream(session).map(
    (rows) => rows.where((t) => t.hasUnreadFor(viewer)).length,
  );
}

/// Creates the thread only when missing, so "open the conversation" is safe to
/// call repeatedly.
Future<void> ensureThread({
  required String id,
  required String clientUid,
  required String clientEmail,
  required String clientName,
  required String subject,
  String? projectId,
  String? projectName,
  required String openedBy,
}) async {
  final ref = _threads().doc(id);
  final existing = await ref.get();
  if (existing.exists) return;

  await ref.set({
    'clientUid': clientUid,
    'clientEmail': clientEmail.trim().toLowerCase(),
    'clientName': clientName.trim(),
    if (projectId != null && projectId.isNotEmpty) 'projectId': projectId,
    if (projectName != null && projectName.isNotEmpty) 'projectName': projectName,
    'subject': subject.trim().isEmpty ? 'Messages' : subject.trim(),
    'createdAt': DateTime.now().toUtc().toIso8601String(),
    'lastMessageAt': '',
    'lastMessagePreview': '',
    'lastMessageBy': openedBy,
    'adminReadAt': '',
    'clientReadAt': '',
  });
}

Future<void> markThreadRead(String threadId, String viewer) async {
  final now = DateTime.now().toUtc().toIso8601String();
  await _threads().doc(threadId).update({
    viewer == 'admin' ? 'adminReadAt' : 'clientReadAt': now,
  });
}

/// Appends a message and refreshes the summary the inbox reads from.
Future<void> sendMessage({
  required String threadId,
  required String body,
  required PortalSession session,
}) async {
  final text = body.trim();
  if (text.isEmpty) throw Exception('Write a message first.');
  if (text.length > messageMaxLength) {
    throw Exception('Keep the message under $messageMaxLength characters.');
  }

  final viewer = viewerAuthorFor(session);
  final now = DateTime.now().toUtc().toIso8601String();

  await _threads().doc(threadId).collection('messages').add({
    'body': text,
    'senderUid': session.uid,
    'senderName': session.displayName.isEmpty ? session.email : session.displayName,
    'senderRole': viewer,
    'createdAt': now,
  });

  await _threads().doc(threadId).update({
    'lastMessageAt': now,
    'lastMessagePreview': text.length > 140 ? text.substring(0, 140) : text,
    'lastMessageBy': viewer,
    // Sending counts as having read everything before it.
    if (viewer == 'admin') 'adminReadAt': now else 'clientReadAt': now,
  });
}

String _formatWhen(String iso) {
  if (iso.isEmpty) return '';
  final at = DateTime.tryParse(iso)?.toLocal();
  if (at == null) return '';
  final now = DateTime.now();
  final sameDay = at.year == now.year && at.month == now.month && at.day == now.day;
  if (sameDay) {
    final hour = at.hour % 12 == 0 ? 12 : at.hour % 12;
    final minute = at.minute.toString().padLeft(2, '0');
    return '$hour:$minute ${at.hour < 12 ? 'AM' : 'PM'}';
  }
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];
  return '${months[at.month - 1]} ${at.day}';
}

String _formatStamp(String iso) {
  if (iso.isEmpty) return '';
  final at = DateTime.tryParse(iso)?.toLocal();
  if (at == null) return '';
  return '${_formatWhen(iso)} · ${at.day}/${at.month}';
}

/// Thread list. Admins see every client; everyone else sees only their own.
class MessagesPage extends StatelessWidget {
  const MessagesPage({super.key, this.openThreadId});

  /// Set when a push notification launched the app straight into a thread.
  final String? openThreadId;

  @override
  Widget build(BuildContext context) {
    final session = PortalGuideScope.maybeOf(context)?.session;
    if (session == null) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }
    final viewer = viewerAuthorFor(session);

    return Scaffold(
      body: SafeArea(
        bottom: false,
        child: Column(
          children: [
            const PortalHeader(),
            Expanded(
              child: StreamBuilder<List<MessageThread>>(
                stream: threadsStream(session),
                builder: (context, snap) {
                  if (snap.hasError) {
                    return _Centered(text: 'Could not load messages.');
                  }
                  if (!snap.hasData) {
                    return const Center(child: CircularProgressIndicator());
                  }
                  final rows = snap.data!;
                  return ListView(
                    padding: const EdgeInsets.fromLTRB(24, 24, 24, 40),
                    children: [
                      Text('MESSAGES', style: kickerStyle),
                      const SizedBox(height: 8),
                      Text(
                        session.isAdmin ? 'Client messages.' : 'Ask the studio.',
                        style: displayStyle(32),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        session.isAdmin
                            ? 'Newest first. A dot marks the ones waiting on you.'
                            : 'Questions about scope, timelines, or a document. Replies arrive here.',
                        style: bodyStyle,
                      ),
                      const SizedBox(height: 24),
                      if (!session.isAdmin &&
                          !rows.any((t) => t.id == threadIdForClient(session.uid)))
                        _StartThreadCard(session: session),
                      HairlineList(
                        empty: Text(
                          session.isAdmin ? 'No client has written yet.' : 'No messages yet.',
                          style: bodyStyle,
                        ),
                        children: rows
                            .map(
                              (t) => _ThreadRow(
                                thread: t,
                                viewer: viewer,
                                isAdmin: session.isAdmin,
                              ),
                            )
                            .toList(),
                      ),
                    ],
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _Centered extends StatelessWidget {
  const _Centered({required this.text});
  final String text;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Text(text, style: bodyStyle, textAlign: TextAlign.center),
      ),
    );
  }
}

class _StartThreadCard extends StatefulWidget {
  const _StartThreadCard({required this.session});
  final PortalSession session;

  @override
  State<_StartThreadCard> createState() => _StartThreadCardState();
}

class _StartThreadCardState extends State<_StartThreadCard> {
  bool _busy = false;
  String _error = '';

  Future<void> _start() async {
    setState(() {
      _busy = true;
      _error = '';
    });
    try {
      final session = widget.session;
      await ensureThread(
        id: threadIdForClient(session.uid),
        clientUid: session.uid,
        clientEmail: session.email,
        clientName: session.displayName.isEmpty ? session.email : session.displayName,
        subject: 'General',
        openedBy: 'client',
      );
    } catch (_) {
      if (mounted) setState(() => _error = 'Could not start the conversation.');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 24),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(color: Colors.white, border: Border.all(color: hairline)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Start a conversation', style: displayStyle(22)),
          const SizedBox(height: 6),
          Text(
            'Opens a direct thread with the studio. There is no charge for asking a question.',
            style: bodyStyle,
          ),
          if (_error.isNotEmpty) ...[
            const SizedBox(height: 10),
            Text(_error, style: GoogleFonts.dmSans(fontSize: 12, color: errorRed)),
          ],
          const SizedBox(height: 16),
          PortalPillButton(
            label: _busy ? 'Opening…' : 'Message the studio',
            enabled: !_busy,
            onPressed: _start,
          ),
        ],
      ),
    );
  }
}

class _ThreadRow extends StatelessWidget {
  const _ThreadRow({required this.thread, required this.viewer, required this.isAdmin});

  final MessageThread thread;
  final String viewer;
  final bool isAdmin;

  @override
  Widget build(BuildContext context) {
    final unread = thread.hasUnreadFor(viewer);
    final heading = isAdmin
        ? (thread.clientName.isNotEmpty ? thread.clientName : thread.clientEmail)
        : thread.title;

    return InkWell(
      onTap: () => Navigator.of(context).push(
        MaterialPageRoute(builder: (_) => ThreadPage(threadId: thread.id)),
      ),
      child: Container(
        constraints: const BoxConstraints(minHeight: 64),
        padding: const EdgeInsets.symmetric(vertical: 14),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (unread)
              Container(
                width: 7,
                height: 7,
                margin: const EdgeInsets.only(top: 6, right: 9),
                decoration: const BoxDecoration(color: ink, shape: BoxShape.circle),
              ),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    heading,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: GoogleFonts.dmSans(
                      fontSize: 15,
                      fontWeight: unread ? FontWeight.w700 : FontWeight.w600,
                      color: ink,
                    ),
                  ),
                  const SizedBox(height: 3),
                  Text(
                    thread.lastMessagePreview.isEmpty
                        ? 'No messages yet'
                        : thread.lastMessagePreview,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: GoogleFonts.dmSans(fontSize: 12, height: 1.4, color: slate),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 10),
            Text(
              _formatWhen(thread.lastMessageAt),
              style: GoogleFonts.dmSans(fontSize: 11, color: slateMuted),
            ),
          ],
        ),
      ),
    );
  }
}

/// One conversation, with the composer.
class ThreadPage extends StatefulWidget {
  const ThreadPage({super.key, required this.threadId});
  final String threadId;

  @override
  State<ThreadPage> createState() => _ThreadPageState();
}

class _ThreadPageState extends State<ThreadPage> {
  final _controller = TextEditingController();
  final _scroll = ScrollController();
  bool _sending = false;
  String _error = '';
  String _clearedFor = '';

  @override
  void dispose() {
    _controller.dispose();
    _scroll.dispose();
    super.dispose();
  }

  /// Clears the unread marker once per incoming message rather than on every
  /// rebuild, so a quiet thread does not keep writing.
  void _clearUnread(MessageThread thread, String viewer) {
    if (!thread.hasUnreadFor(viewer)) return;
    if (_clearedFor == thread.lastMessageAt) return;
    _clearedFor = thread.lastMessageAt;
    markThreadRead(thread.id, viewer).catchError((_) {});
  }

  Future<void> _send(PortalSession session) async {
    final text = _controller.text.trim();
    if (text.isEmpty || _sending) return;
    setState(() {
      _sending = true;
      _error = '';
    });
    try {
      await sendMessage(threadId: widget.threadId, body: text, session: session);
      _controller.clear();
    } catch (_) {
      if (mounted) setState(() => _error = 'Could not send the message.');
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final session = PortalGuideScope.maybeOf(context)?.session;
    if (session == null) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }
    final viewer = viewerAuthorFor(session);
    final threadRef = FirebaseFirestore.instance.collection('threads').doc(widget.threadId);

    return Scaffold(
      body: SafeArea(
        bottom: false,
        child: Column(
          children: [
            const PortalHeader(),
            Expanded(
              child: StreamBuilder<DocumentSnapshot<Map<String, dynamic>>>(
                stream: threadRef.snapshots(),
                builder: (context, threadSnap) {
                  if (threadSnap.hasError) {
                    return _Centered(text: 'This conversation is not available.');
                  }
                  if (!threadSnap.hasData) {
                    return const Center(child: CircularProgressIndicator());
                  }
                  if (!threadSnap.data!.exists) {
                    return _Centered(text: 'This conversation is not available.');
                  }
                  final thread = MessageThread.fromMap(
                    threadSnap.data!.id,
                    threadSnap.data!.data() ?? const {},
                  );
                  _clearUnread(thread, viewer);

                  final heading = session.isAdmin
                      ? (thread.clientName.isNotEmpty ? thread.clientName : thread.clientEmail)
                      : thread.title;

                  return Column(
                    children: [
                      Padding(
                        padding: const EdgeInsets.fromLTRB(24, 18, 24, 10),
                        child: Row(
                          children: [
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(heading, style: displayStyle(24)),
                                  if (session.isAdmin) ...[
                                    const SizedBox(height: 3),
                                    Text(
                                      thread.clientEmail,
                                      style: GoogleFonts.dmSans(fontSize: 12, color: slate),
                                    ),
                                  ],
                                ],
                              ),
                            ),
                            TextButton(
                              onPressed: () => Navigator.of(context).maybePop(),
                              child: Text(
                                'Back',
                                style: GoogleFonts.dmSans(fontSize: 13, color: slate),
                              ),
                            ),
                          ],
                        ),
                      ),
                      const Divider(height: 1, color: hairline),
                      Expanded(
                        child: StreamBuilder<QuerySnapshot<Map<String, dynamic>>>(
                          stream: threadRef.collection('messages').orderBy('createdAt').snapshots(),
                          builder: (context, msgSnap) {
                            if (!msgSnap.hasData) {
                              return const Center(child: CircularProgressIndicator());
                            }
                            final docs = msgSnap.data!.docs;
                            if (docs.isEmpty) {
                              return _Centered(
                                text: 'No messages yet. Write the first one below.',
                              );
                            }
                            WidgetsBinding.instance.addPostFrameCallback((_) {
                              if (!_scroll.hasClients) return;
                              _scroll.jumpTo(_scroll.position.maxScrollExtent);
                            });
                            return ListView.separated(
                              controller: _scroll,
                              padding: const EdgeInsets.fromLTRB(24, 16, 24, 16),
                              itemCount: docs.length,
                              separatorBuilder: (_, _) => const SizedBox(height: 18),
                              itemBuilder: (_, i) {
                                final data = docs[i].data();
                                final senderRole = (data['senderRole'] ?? 'client') as String;
                                final mine = senderRole == viewer;
                                final who = mine
                                    ? 'You'
                                    : senderRole == 'admin'
                                        ? 'CasinWorks'
                                        : (data['senderName'] ?? '') as String;
                                return Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Row(
                                      crossAxisAlignment: CrossAxisAlignment.end,
                                      children: [
                                        Expanded(
                                          child: Text(
                                            who.toUpperCase(),
                                            style: kickerStyle.copyWith(fontSize: 10),
                                          ),
                                        ),
                                        Text(
                                          _formatStamp((data['createdAt'] ?? '') as String),
                                          style: GoogleFonts.dmSans(fontSize: 10, color: slateMuted),
                                        ),
                                      ],
                                    ),
                                    const SizedBox(height: 5),
                                    Text(
                                      (data['body'] ?? '') as String,
                                      style: GoogleFonts.dmSans(
                                        fontSize: 14,
                                        height: 1.45,
                                        color: ink,
                                      ),
                                    ),
                                  ],
                                );
                              },
                            );
                          },
                        ),
                      ),
                      _Composer(
                        controller: _controller,
                        sending: _sending,
                        error: _error,
                        onSend: () => _send(session),
                      ),
                    ],
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _Composer extends StatelessWidget {
  const _Composer({
    required this.controller,
    required this.sending,
    required this.error,
    required this.onSend,
  });

  final TextEditingController controller;
  final bool sending;
  final String error;
  final VoidCallback onSend;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.fromLTRB(
        24,
        12,
        24,
        12 + MediaQuery.of(context).viewPadding.bottom,
      ),
      decoration: const BoxDecoration(
        color: cream,
        border: Border(top: BorderSide(color: hairline)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (error.isNotEmpty) ...[
            Text(error, style: GoogleFonts.dmSans(fontSize: 12, color: errorRed)),
            const SizedBox(height: 8),
          ],
          Row(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Expanded(
                child: TextField(
                  controller: controller,
                  maxLines: 4,
                  minLines: 1,
                  maxLength: messageMaxLength,
                  textInputAction: TextInputAction.newline,
                  keyboardType: TextInputType.multiline,
                  cursorColor: ink,
                  style: GoogleFonts.dmSans(fontSize: 14, color: ink),
                  decoration: const InputDecoration(
                    hintText: 'Write a message…',
                    counterText: '',
                  ),
                ),
              ),
              const SizedBox(width: 10),
              SizedBox(
                height: 46,
                child: FilledButton(
                  onPressed: sending ? null : onSend,
                  style: FilledButton.styleFrom(
                    backgroundColor: ink,
                    foregroundColor: Colors.white,
                    disabledBackgroundColor: ink.withValues(alpha: 0.4),
                    shape: const StadiumBorder(),
                    padding: const EdgeInsets.symmetric(horizontal: 20),
                    textStyle: GoogleFonts.dmSans(fontSize: 13, fontWeight: FontWeight.w600),
                    elevation: 0,
                  ),
                  child: Text(sending ? 'Sending…' : 'Send'),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
