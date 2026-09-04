import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:url_launcher/url_launcher.dart';

import 'account.dart';
import 'admin.dart';
import 'credentials.dart';
import 'theme.dart';
import 'fairway.dart';
import 'widgets.dart';
import 'book.dart';
import 'tutorial.dart';

/// Fill via dart-defines on web (same Firebase project as casinworks.com/portal).
const firebaseOptions = FirebaseOptions(
  apiKey: String.fromEnvironment('FIREBASE_API_KEY', defaultValue: ''),
  appId: String.fromEnvironment('FIREBASE_APP_ID', defaultValue: ''),
  messagingSenderId: String.fromEnvironment('FIREBASE_SENDER_ID', defaultValue: ''),
  projectId: String.fromEnvironment('FIREBASE_PROJECT_ID', defaultValue: ''),
  storageBucket: String.fromEnvironment('FIREBASE_STORAGE_BUCKET', defaultValue: ''),
  authDomain: String.fromEnvironment('FIREBASE_AUTH_DOMAIN', defaultValue: ''),
);

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  if (kIsWeb) {
    if (firebaseOptions.apiKey.isNotEmpty) {
      await Firebase.initializeApp(options: firebaseOptions);
    }
  } else {
    // iOS reads GoogleService-Info.plist; Android reads google-services.json.
    // Never pass the web app ID here — native Firebase will abort the process.
    await Firebase.initializeApp();
  }
  runApp(const CasinWorksPortalApp());
}

class CasinWorksPortalApp extends StatefulWidget {
  const CasinWorksPortalApp({super.key});

  @override
  State<CasinWorksPortalApp> createState() => _CasinWorksPortalAppState();
}

class _CasinWorksPortalAppState extends State<CasinWorksPortalApp> {
  PortalSession? _session;

  /// Every destination in the header menu. Lives here because this is the only
  /// library that can see all the pages.
  Future<void> _go(BuildContext context, PortalDestination destination) async {
    final session = _session;
    if (session == null) return;
    final nav = Navigator.of(context, rootNavigator: true);

    if (destination == PortalDestination.guide) {
      await StoryTutorial.open(context, role: session.role);
      return;
    }
    if (destination == PortalDestination.website) {
      await launchUrl(Uri.parse('https://www.casinworks.com'), mode: LaunchMode.externalApplication);
      return;
    }
    if (destination == PortalDestination.signOut) {
      await FirebaseAuth.instance.signOut();
      nav.popUntil((route) => route.isFirst);
      return;
    }

    // The home screen already is Projects for clients and admins, and the gig
    // board for subcontractors, so those two just unwind the stack.
    final homeIsTarget =
        (destination == PortalDestination.projects && session.seesClientArea) ||
        (destination == PortalDestination.gigs && session.isSubcontractor);
    nav.popUntil((route) => route.isFirst);
    if (homeIsTarget) return;

    final page = switch (destination) {
      PortalDestination.book => BookPage(
        uid: session.uid,
        email: session.email,
        displayName: session.displayName,
        company: session.company,
        isAdmin: session.isAdmin,
      ),
      PortalDestination.gigs => GigBoard(uid: session.uid, email: session.email),
      PortalDestination.clients => const ClientsPage(),
      PortalDestination.users => const UsersPage(),
      PortalDestination.adminInbox => const AdminInboxPage(),
      PortalDestination.account => const AccountPage(),
      _ => null,
    };
    if (page == null) return;
    await nav.push<void>(MaterialPageRoute(builder: (_) => page));
  }

  @override
  Widget build(BuildContext context) {
    return PortalGuideScope(
      session: _session,
      setSession: (session) {
        if (_session == session) return;
        setState(() => _session = session);
      },
      go: _go,
      child: MaterialApp(
        title: 'CasinWorks Portal',
        debugShowCheckedModeBanner: false,
        theme: portalTheme(),
        home: const Gate(),
      ),
    );
  }
}

class Gate extends StatelessWidget {
  const Gate({super.key});

  void _clearGuide(BuildContext context) {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!context.mounted) return;
      PortalGuideScope.maybeOf(context)?.setSession(null);
    });
  }

  @override
  Widget build(BuildContext context) {
    if (Firebase.apps.isEmpty) {
      _clearGuide(context);
      return const SignInPage();
    }
    return StreamBuilder<User?>(
      stream: FirebaseAuth.instance.authStateChanges(),
      builder: (context, snap) {
        if (snap.connectionState == ConnectionState.waiting) {
          return const Scaffold(
            backgroundColor: cream,
            body: Center(child: CircularProgressIndicator()),
          );
        }
        if (snap.data == null) {
          _clearGuide(context);
          return const SignInPage();
        }
        return HomeShell(uid: snap.data!.uid, email: snap.data!.email ?? '');
      },
    );
  }
}

class SignInPage extends StatefulWidget {
  const SignInPage({super.key});
  @override
  State<SignInPage> createState() => _SignInPageState();
}

class _SignInPageState extends State<SignInPage> {
  final email = TextEditingController();
  final password = TextEditingController();
  final displayName = TextEditingController();
  final company = TextEditingController();
  String role = 'client';
  bool register = false;
  bool acceptedPrivacy = false;
  bool remember = false;
  String? error;
  bool sending = false;

  @override
  void initState() {
    super.initState();
    _restoreRemembered();
  }

  Future<void> _restoreRemembered() async {
    final saved = await CredentialStore.read();
    if (saved == null || !mounted) return;
    setState(() {
      email.text = saved.email;
      password.text = saved.password;
      remember = true;
    });
  }

  @override
  void dispose() {
    email.dispose();
    password.dispose();
    displayName.dispose();
    company.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    setState(() {
      sending = true;
      error = null;
    });
    try {
      if (Firebase.apps.isEmpty) {
        throw Exception('Firebase is not configured on this device.');
      }
      if (register) {
        if (displayName.text.trim().isEmpty) {
          throw Exception('Enter your name.');
        }
        if (role == 'client' && company.text.trim().isEmpty) {
          throw Exception('Enter your company.');
        }
        if (!acceptedPrivacy) {
          throw Exception('Please agree to how your details are stored.');
        }
        final cred = await FirebaseAuth.instance.createUserWithEmailAndPassword(
          email: email.text.trim(),
          password: password.text,
        );
        await cred.user?.updateDisplayName(displayName.text.trim());
        await FirebaseFirestore.instance.collection('users').doc(cred.user!.uid).set({
          'email': email.text.trim().toLowerCase(),
          'displayName': displayName.text.trim(),
          'role': role,
          if (role == 'client') 'company': company.text.trim(),
          'privacyAcceptedAt': DateTime.now().toUtc().toIso8601String(),
        });
      } else {
        await FirebaseAuth.instance.signInWithEmailAndPassword(email: email.text.trim(), password: password.text);
      }
      // Only after the credentials are known good, so a typo is never stored.
      if (remember) {
        await CredentialStore.save(email: email.text.trim(), password: password.text);
      } else {
        await CredentialStore.clear();
      }
    } catch (e) {
      setState(() => error = e.toString());
    } finally {
      if (mounted) setState(() => sending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: cream,
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(24, 20, 24, 40),
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Image.asset(
                        'assets/icon/app_wordmark.png',
                        width: 172,
                        filterQuality: FilterQuality.medium,
                      ),
                      const SizedBox(height: 10),
                      Text('INDEPENDENT ENGINEERING', style: kickerStyle.copyWith(fontSize: 10, letterSpacing: 1.6)),
                    ],
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(border: Border.all(color: hairline)),
                  child: Text('ENCRYPTED PORTAL', style: kickerStyle.copyWith(fontSize: 10)),
                ),
              ],
            ),
            const SizedBox(height: 32),
            RichText(
              text: TextSpan(
                style: displayStyle(40),
                children: [
                  TextSpan(text: register ? 'Request ' : 'Your work, '),
                  TextSpan(
                    text: register ? 'access.' : 'in one place.',
                    style: displayStyle(40).copyWith(fontStyle: FontStyle.italic, color: slate),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 8),
            Text('WE MAKE THINGS WORK.', style: kickerStyle),
            const SizedBox(height: 28),
            WorkspaceToggle(role: role, onChanged: (v) => setState(() => role = v)),
            const SizedBox(height: 24),
            if (register) ...[
              PortalField(label: 'Full name', controller: displayName),
              const SizedBox(height: 16),
              if (role == 'client') ...[PortalField(label: 'Company', controller: company), const SizedBox(height: 16)],
            ],
            PortalField(label: 'Email', controller: email, keyboardType: TextInputType.emailAddress),
            const SizedBox(height: 16),
            PortalField(label: 'Password', controller: password, obscure: true),
            const SizedBox(height: 18),
            PortalCheckbox(
              value: remember,
              onChanged: (v) => setState(() => remember = v),
              label: 'Remember me',
              note: 'Keeps your email and password in this device’s secure storage so you can '
                  'sign back in without typing them.',
            ),
            if (register) ...[
              const SizedBox(height: 20),
              PrivacyConsent(
                accepted: acceptedPrivacy,
                onChanged: (v) => setState(() {
                  acceptedPrivacy = v;
                  error = null;
                }),
              ),
            ],
            if (error != null) ...[
              const SizedBox(height: 12),
              Text(error!, style: GoogleFonts.dmSans(fontSize: 13, color: errorRed)),
            ],
            const SizedBox(height: 24),
            PortalPillButton(
              label: sending
                  ? 'Please wait…'
                  : register
                  ? 'Create account'
                  : 'Continue as ${role == 'client' ? 'client' : 'subcontractor'}',
              enabled: !sending && (!register || acceptedPrivacy),
              onPressed: _submit,
            ),
            if (!register) ...[
              const SizedBox(height: 16),
              Center(
                child: GestureDetector(
                  onTap: openPrivacyPolicy,
                  child: Text(
                    'Privacy policy',
                    style: GoogleFonts.dmSans(fontSize: 13, color: slate, decoration: TextDecoration.underline),
                  ),
                ),
              ),
            ],
            const SizedBox(height: 28),
            const Divider(color: hairline, height: 1),
            const SizedBox(height: 20),
            Wrap(
              children: [
                Text(
                  register ? 'Already have access? ' : 'Need access? ',
                  style: GoogleFonts.dmSans(fontSize: 14, color: const Color(0xFF475569)),
                ),
                GestureDetector(
                  onTap: () => setState(() {
                    register = !register;
                    error = null;
                  }),
                  child: Text(
                    register ? 'Sign in' : 'Register',
                    style: GoogleFonts.dmSans(
                      fontSize: 14,
                      fontWeight: FontWeight.w500,
                      color: ink,
                      decoration: TextDecoration.underline,
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class HomeShell extends StatelessWidget {
  const HomeShell({super.key, required this.uid, required this.email});
  final String uid;
  final String email;

  @override
  Widget build(BuildContext context) {
    return StreamBuilder<DocumentSnapshot<Map<String, dynamic>>>(
      stream: FirebaseFirestore.instance.collection('users').doc(uid).snapshots(),
      builder: (context, snap) {
        // Wait for the profile before naming a role. Guessing 'client' here used to
        // open the client guide, then open it a second time once the real role landed.
        if (!snap.hasData) {
          return const Scaffold(
            backgroundColor: cream,
            body: Center(child: CircularProgressIndicator()),
          );
        }
        final role = (snap.data?.data()?['role'] as String?) ?? 'client';
        final displayName = (snap.data?.data()?['displayName'] as String?) ?? '';
        final company = (snap.data?.data()?['company'] as String?) ?? '';
        final session = PortalSession(
          uid: uid,
          email: email,
          role: role,
          displayName: displayName,
          company: company,
        );
        WidgetsBinding.instance.addPostFrameCallback((_) {
          if (!context.mounted) return;
          PortalGuideScope.maybeOf(context)?.setSession(session);
        });
        if (role == 'subcontractor') {
          return TutorialGate(
            role: role,
            child: GigBoard(uid: uid, email: email),
          );
        }
        return TutorialGate(
          role: role,
          child: ClientHome(
            uid: uid,
            email: email,
            isAdmin: role == 'admin',
            displayName: displayName,
            company: company,
          ),
        );
      },
    );
  }
}

class ClientHome extends StatefulWidget {
  const ClientHome({
    super.key,
    required this.uid,
    required this.email,
    this.isAdmin = false,
    this.displayName = '',
    this.company = '',
  });
  final String uid;
  final String email;
  final bool isAdmin;
  final String displayName;
  final String company;

  @override
  State<ClientHome> createState() => _ClientHomeState();
}

class _ClientHomeState extends State<ClientHome> {
  @override
  void initState() {
    super.initState();
    _claimPendingProjects();
  }

  Future<void> _claimPendingProjects() async {
    final email = widget.email.trim().toLowerCase();
    if (email.isEmpty) return;
    try {
      final snap = await FirebaseFirestore.instance.collection('projects').where('clientEmail', isEqualTo: email).get();
      for (final d in snap.docs) {
        if (d.data()['clientId'] == widget.uid) continue;
        await d.reference.update({'clientId': widget.uid, 'clientName': d.data()['clientName'] ?? email});
      }
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    final email = widget.email.trim().toLowerCase();
    return Scaffold(
      backgroundColor: cream,
      body: SafeArea(
        child: Column(
          children: [
            const PortalHeader(),
            Expanded(
              child: StreamBuilder<QuerySnapshot<Map<String, dynamic>>>(
                stream: widget.isAdmin
                    ? FirebaseFirestore.instance.collection('projects').snapshots()
                    : FirebaseFirestore.instance
                          .collection('projects')
                          .where('clientId', isEqualTo: widget.uid)
                          .snapshots(),
                builder: (context, byId) {
                  return StreamBuilder<QuerySnapshot<Map<String, dynamic>>>(
                    stream: widget.isAdmin || email.isEmpty
                        ? Stream<QuerySnapshot<Map<String, dynamic>>>.empty()
                        : FirebaseFirestore.instance
                              .collection('projects')
                              .where('clientEmail', isEqualTo: email)
                              .snapshots(),
                    builder: (context, byEmail) {
                      if (!byId.hasData && !byEmail.hasData) {
                        return const Center(child: CircularProgressIndicator());
                      }
                      final map = <String, QueryDocumentSnapshot<Map<String, dynamic>>>{};
                      for (final d in [...?byId.data?.docs, ...?byEmail.data?.docs]) {
                        map[d.id] = d;
                      }
                      final docs = map.values.toList();
                      return ListView(
                        padding: const EdgeInsets.fromLTRB(24, 28, 24, 40),
                        children: [
                          Text(widget.isAdmin ? 'STUDIO DESK' : 'CLIENT WORKSPACE', style: kickerStyle),
                          const SizedBox(height: 8),
                          RichText(
                            text: TextSpan(
                              style: displayStyle(36),
                              children: [
                                TextSpan(text: widget.isAdmin ? 'Open a project, ' : 'The work, '),
                                TextSpan(
                                  text: widget.isAdmin ? 'work the hole.' : 'in progress.',
                                  style: displayStyle(36).copyWith(fontStyle: FontStyle.italic, color: slateMuted),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(height: 12),
                          Text(
                            widget.isAdmin
                                ? 'Each card is an engagement. Open it to see the current milestone.'
                                : 'Project cards, milestones, and documents — not a purchased product marketplace.',
                            style: bodyStyle,
                          ),
                          const SizedBox(height: 20),
                          Align(
                            alignment: Alignment.centerLeft,
                            child: FilledButton(
                              onPressed: () => Navigator.push(
                                context,
                                MaterialPageRoute(
                                  builder: (_) => BookPage(
                                    uid: widget.uid,
                                    email: widget.email,
                                    displayName: widget.displayName,
                                    company: widget.company,
                                    isAdmin: widget.isAdmin,
                                  ),
                                ),
                              ),
                              style: FilledButton.styleFrom(
                                backgroundColor: ink,
                                foregroundColor: Colors.white,
                                padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
                                shape: const StadiumBorder(),
                                textStyle: GoogleFonts.dmSans(fontSize: 13, fontWeight: FontWeight.w600),
                                elevation: 0,
                              ),
                              child: Text(widget.isAdmin ? 'Consultation calendar' : 'Book a consultation'),
                            ),
                          ),
                          const SizedBox(height: 28),
                          HairlineList(
                            empty: Text(
                              widget.isAdmin
                                  ? 'No projects yet. Add a company under Clients, then start a project from their page.'
                                  : 'No projects assigned yet. CasinWorks will attach an engagement when work starts.',
                              style: bodyStyle,
                            ),
                            children: docs.map((doc) {
                              final d = doc.data();
                              final pct = (d['progressPercentage'] as num?)?.toInt() ?? 0;
                              final name = d['name'] as String? ?? 'Project';
                              final statusRaw = (d['status'] as String?)?.trim();
                              final statusLabel = (statusRaw == null || statusRaw.isEmpty)
                                  ? 'Active'
                                  : '${statusRaw[0].toUpperCase()}${statusRaw.substring(1)}';
                              final clientBit = (d['clientName'] as String?) ?? (d['clientEmail'] as String?) ?? '';
                              return InkWell(
                                onTap: () => Navigator.push(
                                  context,
                                  MaterialPageRoute(
                                    builder: (_) => ProjectPage(projectId: doc.id, name: name),
                                  ),
                                ),
                                child: Padding(
                                  padding: const EdgeInsets.symmetric(vertical: 22),
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        [if (clientBit.isNotEmpty) clientBit, statusLabel].join(' · '),
                                        style: kickerStyle,
                                      ),
                                      const SizedBox(height: 8),
                                      Text(
                                        name,
                                        style: GoogleFonts.cormorantGaramond(
                                          fontSize: 24,
                                          fontWeight: FontWeight.w600,
                                          color: ink,
                                        ),
                                      ),
                                      const SizedBox(height: 14),
                                      ClipRect(
                                        child: LinearProgressIndicator(
                                          value: pct / 100,
                                          minHeight: 6,
                                          color: ink,
                                          backgroundColor: hairline,
                                        ),
                                      ),
                                      const SizedBox(height: 10),
                                      Row(
                                        children: [
                                          Text('$pct% complete', style: GoogleFonts.dmSans(fontSize: 13, color: slate)),
                                          const Spacer(),
                                          Text(
                                            widget.isAdmin ? 'Open project →' : 'Open course →',
                                            style: GoogleFonts.dmSans(
                                              fontSize: 13,
                                              fontWeight: FontWeight.w500,
                                              color: ink,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ],
                                  ),
                                ),
                              );
                            }).toList(),
                          ),
                        ],
                      );
                    },
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

class ProjectPage extends StatefulWidget {
  const ProjectPage({super.key, required this.projectId, required this.name});
  final String projectId;
  final String name;

  @override
  State<ProjectPage> createState() => _ProjectPageState();
}

class _ProjectPageState extends State<ProjectPage> {
  String view = 'course';
  String? highlightId;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: cream,
      body: SafeArea(
        child: Column(
          children: [
            const PortalHeader(),
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 8, 24, 0),
              child: Row(
                children: [
                  TextButton(
                    onPressed: () => Navigator.pop(context),
                    child: Text('← Projects', style: GoogleFonts.dmSans(fontSize: 13, color: slate)),
                  ),
                  const Spacer(),
                  TextButton(
                    onPressed: () => Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (_) => DocumentsPage(projectId: widget.projectId, name: widget.name),
                      ),
                    ),
                    child: Text(
                      'Documents',
                      style: GoogleFonts.dmSans(
                        fontSize: 13,
                        fontWeight: FontWeight.w500,
                        color: ink,
                        decoration: TextDecoration.underline,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            Expanded(
              child: StreamBuilder<QuerySnapshot<Map<String, dynamic>>>(
                stream: FirebaseFirestore.instance
                    .collection('milestones')
                    .where('projectId', isEqualTo: widget.projectId)
                    .snapshots(),
                builder: (context, snap) {
                  if (!snap.hasData) return const Center(child: CircularProgressIndicator());
                  final items = [...snap.data!.docs]
                    ..sort((a, b) => ((a.data()['order'] as num?) ?? 0).compareTo((b.data()['order'] as num?) ?? 0));
                  final holes = items
                      .map(
                        (doc) => FairwayHole(
                          id: doc.id,
                          title: doc.data()['title'] as String? ?? '',
                          status: doc.data()['status'] as String? ?? 'upcoming',
                          date: doc.data()['date'] as String? ?? '',
                          description: doc.data()['description'] as String? ?? '',
                          kind: doc.data()['kind'] as String? ?? '',
                        ),
                      )
                      .toList();
                  return ListView(
                    padding: const EdgeInsets.fromLTRB(24, 8, 24, 40),
                    children: [
                      Text('THE COURSE', style: kickerStyle),
                      const SizedBox(height: 8),
                      Text(widget.name, style: displayStyle(32)),
                      const SizedBox(height: 8),
                      Text('The fairway walks to the current hole. Tap a pin to inspect it.', style: bodyStyle),
                      const SizedBox(height: 20),
                      Center(
                        child: PortalSegmented(
                          value: view,
                          options: const <(String, String)>[
                            ('course', 'The course'),
                            ('timeline', 'Where things stand'),
                          ],
                          onChanged: (v) => setState(() => view = v),
                        ),
                      ),
                      const SizedBox(height: 20),
                      if (view == 'course')
                        FairwayVisual(
                          holes: holes,
                          onShowInList: (hole) => setState(() {
                            view = 'timeline';
                            highlightId = hole.id;
                          }),
                        )
                      else
                        HairlineList(
                          empty: Text('No milestones yet.', style: bodyStyle),
                          children: items.map((doc) {
                            final m = doc.data();
                            final status = (m['status'] as String?) ?? '';
                            final highlighted = highlightId == doc.id;
                            return Container(
                              color: highlighted ? Colors.white : null,
                              padding: EdgeInsets.symmetric(vertical: 16, horizontal: highlighted ? 12 : 0),
                              child: Row(
                                children: [
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          m['title'] as String? ?? '',
                                          style: GoogleFonts.dmSans(
                                            fontSize: 15,
                                            fontWeight: FontWeight.w600,
                                            color: ink,
                                          ),
                                        ),
                                        if ((m['date'] as String?)?.isNotEmpty == true)
                                          Padding(
                                            padding: const EdgeInsets.only(top: 4),
                                            child: Text(
                                              m['date'] as String,
                                              style: GoogleFonts.dmSans(fontSize: 12, color: slate),
                                            ),
                                          ),
                                      ],
                                    ),
                                  ),
                                  StatusPill(
                                    label: status.isEmpty
                                        ? 'Upcoming'
                                        : '${status[0].toUpperCase()}${status.substring(1)}',
                                    current: status == 'current',
                                  ),
                                ],
                              ),
                            );
                          }).toList(),
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

class DocumentsPage extends StatelessWidget {
  const DocumentsPage({super.key, required this.projectId, required this.name});
  final String projectId;
  final String name;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: cream,
      body: SafeArea(
        child: Column(
          children: [
            const PortalHeader(),
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 8, 24, 0),
              child: Align(
                alignment: Alignment.centerLeft,
                child: TextButton(
                  onPressed: () => Navigator.pop(context),
                  child: Text('← $name', style: GoogleFonts.dmSans(fontSize: 13, color: slate)),
                ),
              ),
            ),
            Expanded(
              child: StreamBuilder<QuerySnapshot<Map<String, dynamic>>>(
                stream: FirebaseFirestore.instance
                    .collection('documents')
                    .where('projectId', isEqualTo: projectId)
                    .snapshots(),
                builder: (context, snap) {
                  if (!snap.hasData) return const Center(child: CircularProgressIndicator());
                  final docs = snap.data!.docs;
                  return ListView(
                    padding: const EdgeInsets.fromLTRB(24, 8, 24, 40),
                    children: [
                      Text('RECORDS', style: kickerStyle),
                      const SizedBox(height: 8),
                      Text('Documents.', style: displayStyle(32)),
                      const SizedBox(height: 8),
                      Text(
                        'Quotations, purchase orders, invoices, and files attached to this project.',
                        style: bodyStyle,
                      ),
                      const SizedBox(height: 24),
                      HairlineList(
                        empty: Text('No records yet.', style: bodyStyle),
                        children: docs.map((doc) {
                          final d = doc.data();
                          final fileUrl = d['fileUrl'] as String?;
                          return InkWell(
                            onTap: fileUrl == null || fileUrl.isEmpty
                                ? null
                                : () => launchUrl(Uri.parse(fileUrl), mode: LaunchMode.externalApplication),
                            child: Padding(
                              padding: const EdgeInsets.symmetric(vertical: 18),
                              child: Row(
                                children: [
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          d['title'] as String? ?? d['type'] as String? ?? 'Document',
                                          style: GoogleFonts.dmSans(fontSize: 15, fontWeight: FontWeight.w600),
                                        ),
                                        const SizedBox(height: 4),
                                        Text(
                                          [
                                            d['type'],
                                            d['date'],
                                            d['amount'],
                                          ].where((v) => v != null && v.toString().isNotEmpty).join(' · '),
                                          style: GoogleFonts.dmSans(fontSize: 12, color: slate),
                                        ),
                                      ],
                                    ),
                                  ),
                                  StatusPill(label: (d['status'] as String? ?? 'issued').replaceAll('_', ' ')),
                                ],
                              ),
                            ),
                          );
                        }).toList(),
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

class GigBoard extends StatelessWidget {
  const GigBoard({super.key, required this.uid, required this.email});
  final String uid;
  final String email;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: cream,
      body: SafeArea(
        child: Column(
          children: [
            const PortalHeader(),
            Expanded(
              child: StreamBuilder<QuerySnapshot<Map<String, dynamic>>>(
                stream: FirebaseFirestore.instance.collection('gigs').where('status', isEqualTo: 'open').snapshots(),
                builder: (context, snap) {
                  if (!snap.hasData) return const Center(child: CircularProgressIndicator());
                  final gigs = snap.data!.docs;
                  return ListView(
                    padding: const EdgeInsets.fromLTRB(24, 28, 24, 40),
                    children: [
                      Text('CASINWORKS // SUBCONTRACTOR REGISTRY', style: kickerStyle),
                      const SizedBox(height: 8),
                      RichText(
                        text: TextSpan(
                          style: displayStyle(36),
                          children: [
                            const TextSpan(text: 'High-stakes engagements & '),
                            TextSpan(
                              text: 'open postings.',
                              style: displayStyle(36).copyWith(fontStyle: FontStyle.italic, color: slateMuted),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 12),
                      Text(
                        'Specialized roles for independent engineers. Apply here; engagement contracts happen off-platform.',
                        style: bodyStyle,
                      ),
                      const SizedBox(height: 28),
                      HairlineList(
                        empty: Text('No open postings.', style: bodyStyle),
                        children: gigs.map((doc) {
                          final g = doc.data();
                          return Padding(
                            padding: const EdgeInsets.symmetric(vertical: 20),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                if ((g['discipline'] as String?)?.isNotEmpty == true)
                                  Text((g['discipline'] as String).toUpperCase(), style: kickerStyle),
                                const SizedBox(height: 6),
                                Text(
                                  g['title'] as String? ?? '',
                                  style: GoogleFonts.cormorantGaramond(
                                    fontSize: 22,
                                    fontWeight: FontWeight.w600,
                                    color: ink,
                                  ),
                                ),
                                if ((g['location'] as String?)?.isNotEmpty == true)
                                  Padding(
                                    padding: const EdgeInsets.only(top: 6),
                                    child: Text(
                                      g['location'] as String,
                                      style: GoogleFonts.dmSans(fontSize: 13, color: slate),
                                    ),
                                  ),
                                const SizedBox(height: 14),
                                Align(
                                  alignment: Alignment.centerLeft,
                                  child: FilledButton(
                                    onPressed: () async {
                                      await FirebaseFirestore.instance.collection('applications').add({
                                        'gigId': doc.id,
                                        'applicantId': uid,
                                        'applicantEmail': email,
                                        'applicantName': email,
                                        'status': 'pending',
                                        'createdAt': DateTime.now().toIso8601String(),
                                      });
                                      if (context.mounted) {
                                        ScaffoldMessenger.of(context).showSnackBar(
                                          SnackBar(
                                            backgroundColor: ink,
                                            content: Text(
                                              'Application sent',
                                              style: GoogleFonts.dmSans(color: Colors.white),
                                            ),
                                          ),
                                        );
                                      }
                                    },
                                    style: FilledButton.styleFrom(
                                      backgroundColor: ink,
                                      foregroundColor: Colors.white,
                                      padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 10),
                                      shape: const StadiumBorder(),
                                      textStyle: GoogleFonts.dmSans(fontSize: 12, fontWeight: FontWeight.w600),
                                      elevation: 0,
                                    ),
                                    child: const Text('Apply'),
                                  ),
                                ),
                              ],
                            ),
                          );
                        }).toList(),
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
