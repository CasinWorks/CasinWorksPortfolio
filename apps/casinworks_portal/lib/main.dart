import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:url_launcher/url_launcher.dart';

/// Fill via `flutterfire configure` (same Firebase project as the web portal).
const firebaseOptions = FirebaseOptions(
  apiKey: String.fromEnvironment('FIREBASE_API_KEY', defaultValue: ''),
  appId: String.fromEnvironment('FIREBASE_APP_ID', defaultValue: ''),
  messagingSenderId: String.fromEnvironment('FIREBASE_SENDER_ID', defaultValue: ''),
  projectId: String.fromEnvironment('FIREBASE_PROJECT_ID', defaultValue: ''),
  storageBucket: String.fromEnvironment('FIREBASE_STORAGE_BUCKET', defaultValue: ''),
  authDomain: String.fromEnvironment('FIREBASE_AUTH_DOMAIN', defaultValue: ''),
);

const cream = Color(0xFFECEBE7);
const ink = Color(0xFF1A1A1A);

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  if (firebaseOptions.apiKey.isNotEmpty) {
    await Firebase.initializeApp(options: firebaseOptions);
  }
  runApp(const CasinWorksPortalApp());
}

class CasinWorksPortalApp extends StatelessWidget {
  const CasinWorksPortalApp({super.key});

  @override
  Widget build(BuildContext context) {
    final base = ThemeData(
      useMaterial3: true,
      scaffoldBackgroundColor: cream,
      colorScheme: const ColorScheme.light(
        primary: ink,
        onPrimary: Colors.white,
        surface: cream,
        onSurface: ink,
      ),
      appBarTheme: const AppBarTheme(
        backgroundColor: cream,
        foregroundColor: ink,
        elevation: 0,
        scrolledUnderElevation: 0,
      ),
    );
    return MaterialApp(
      title: 'CasinWorks Portal',
      debugShowCheckedModeBanner: false,
      theme: base.copyWith(
        textTheme: GoogleFonts.dmSansTextTheme(base.textTheme).copyWith(
          headlineLarge: GoogleFonts.cormorantGaramond(
            fontSize: 36,
            fontWeight: FontWeight.w600,
            color: ink,
          ),
        ),
      ),
      home: const Gate(),
    );
  }
}

class Gate extends StatelessWidget {
  const Gate({super.key});

  @override
  Widget build(BuildContext context) {
    if (Firebase.apps.isEmpty) {
      return const Scaffold(
        body: Padding(
          padding: EdgeInsets.all(28),
          child: Text(
            'Run flutterfire configure (same Firebase project as casinworks.com/portal), then rebuild.',
          ),
        ),
      );
    }
    return StreamBuilder<User?>(
      stream: FirebaseAuth.instance.authStateChanges(),
      builder: (context, snap) {
        if (snap.connectionState == ConnectionState.waiting) {
          return const Scaffold(body: Center(child: CircularProgressIndicator()));
        }
        if (snap.data == null) return const SignInPage();
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
  String role = 'client';
  String? error;
  bool sending = false;

  @override
  void dispose() {
    email.dispose();
    password.dispose();
    super.dispose();
  }

  Future<void> _submit({required bool register}) async {
    setState(() {
      sending = true;
      error = null;
    });
    try {
      if (register) {
        final cred = await FirebaseAuth.instance.createUserWithEmailAndPassword(
          email: email.text.trim(),
          password: password.text,
        );
        await FirebaseFirestore.instance.collection('users').doc(cred.user!.uid).set({
          'email': email.text.trim().toLowerCase(),
          'displayName': email.text.trim(),
          'role': role,
        });
      } else {
        await FirebaseAuth.instance.signInWithEmailAndPassword(
          email: email.text.trim(),
          password: password.text,
        );
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
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(28),
          children: [
            Text('CASINWORKS', style: GoogleFonts.dmSans(letterSpacing: 3, fontSize: 12, fontWeight: FontWeight.w600)),
            const SizedBox(height: 24),
            Text('Your work, in one place.', style: GoogleFonts.cormorantGaramond(fontSize: 36, fontWeight: FontWeight.w600)),
            const SizedBox(height: 24),
            SegmentedButton<String>(
              segments: const [
                ButtonSegment(value: 'client', label: Text('Client')),
                ButtonSegment(value: 'subcontractor', label: Text('Looking for work')),
              ],
              selected: {role},
              onSelectionChanged: (s) => setState(() => role = s.first),
            ),
            const SizedBox(height: 16),
            TextField(controller: email, decoration: const InputDecoration(labelText: 'Email'), keyboardType: TextInputType.emailAddress),
            TextField(controller: password, decoration: const InputDecoration(labelText: 'Password'), obscureText: true),
            if (error != null) Padding(padding: const EdgeInsets.only(top: 8), child: Text(error!, style: const TextStyle(color: Colors.red))),
            const SizedBox(height: 20),
            FilledButton(
              onPressed: sending ? null : () => _submit(register: false),
              style: FilledButton.styleFrom(backgroundColor: ink, padding: const EdgeInsets.symmetric(vertical: 16), shape: const StadiumBorder()),
              child: const Text('Sign in'),
            ),
            TextButton(onPressed: sending ? null : () => _submit(register: true), child: const Text('Register')),
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
        final role = (snap.data?.data()?['role'] as String?) ?? 'client';
        if (role == 'subcontractor') return GigBoard(uid: uid, email: email);
        return ClientHome(uid: uid, email: email);
      },
    );
  }
}

class ClientHome extends StatefulWidget {
  const ClientHome({super.key, required this.uid, required this.email});
  final String uid;
  final String email;

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
      final snap = await FirebaseFirestore.instance
          .collection('projects')
          .where('clientEmail', isEqualTo: email)
          .get();
      for (final d in snap.docs) {
        if (d.data()['clientId'] == widget.uid) continue;
        await d.reference.update({
          'clientId': widget.uid,
          'clientName': d.data()['clientName'] ?? email,
        });
      }
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    final email = widget.email.trim().toLowerCase();
    return Scaffold(
      appBar: AppBar(
        title: const Text('Projects'),
        actions: [
          IconButton(onPressed: () => FirebaseAuth.instance.signOut(), icon: const Icon(Icons.logout)),
        ],
      ),
      body: StreamBuilder<QuerySnapshot<Map<String, dynamic>>>(
        stream: FirebaseFirestore.instance.collection('projects').where('clientId', isEqualTo: widget.uid).snapshots(),
        builder: (context, byId) {
          return StreamBuilder<QuerySnapshot<Map<String, dynamic>>>(
            stream: email.isEmpty
                ? Stream<QuerySnapshot<Map<String, dynamic>>>.empty()
                : FirebaseFirestore.instance.collection('projects').where('clientEmail', isEqualTo: email).snapshots(),
            builder: (context, byEmail) {
              if (!byId.hasData && !byEmail.hasData) {
                return const Center(child: CircularProgressIndicator());
              }
              final map = <String, QueryDocumentSnapshot<Map<String, dynamic>>>{};
              for (final d in [...?byId.data?.docs, ...?byEmail.data?.docs]) {
                map[d.id] = d;
              }
              final docs = map.values.toList();
              if (docs.isEmpty) {
                return const Padding(
                  padding: EdgeInsets.all(28),
                  child: Text('No projects assigned yet.'),
                );
              }
              return ListView.separated(
                itemCount: docs.length,
                separatorBuilder: (_, __) => const Divider(height: 1),
                itemBuilder: (context, i) {
                  final d = docs[i].data();
                  final pct = (d['progressPercentage'] as num?)?.toInt() ?? 0;
                  return ListTile(
                    title: Text(d['name'] as String? ?? 'Project', style: GoogleFonts.cormorantGaramond(fontSize: 22)),
                    subtitle: LinearProgressIndicator(value: pct / 100, color: ink, backgroundColor: Colors.black12),
                    onTap: () => Navigator.push(
                      context,
                      MaterialPageRoute(builder: (_) => ProjectPage(projectId: docs[i].id, name: d['name'] as String? ?? 'Project')),
                    ),
                  );
                },
              );
            },
          );
        },
      ),
    );
  }
}

class ProjectPage extends StatelessWidget {
  const ProjectPage({super.key, required this.projectId, required this.name});
  final String projectId;
  final String name;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(name),
        actions: [
          TextButton(
            onPressed: () => Navigator.push(
              context,
              MaterialPageRoute(builder: (_) => DocumentsPage(projectId: projectId, name: name)),
            ),
            child: const Text('Documents'),
          ),
        ],
      ),
      body: StreamBuilder<QuerySnapshot<Map<String, dynamic>>>(
        stream: FirebaseFirestore.instance.collection('milestones').where('projectId', isEqualTo: projectId).snapshots(),
        builder: (context, snap) {
          if (!snap.hasData) return const Center(child: CircularProgressIndicator());
          final items = [...snap.data!.docs]..sort((a, b) => ((a.data()['order'] as num?) ?? 0).compareTo((b.data()['order'] as num?) ?? 0));
          return ListView.separated(
            padding: const EdgeInsets.all(20),
            itemCount: items.length,
            separatorBuilder: (_, __) => const Divider(height: 1),
            itemBuilder: (context, i) {
              final m = items[i].data();
              return ListTile(
                contentPadding: EdgeInsets.zero,
                title: Text(m['title'] as String? ?? ''),
                subtitle: Text('${m['date'] ?? ''} · ${m['status'] ?? ''}'),
              );
            },
          );
        },
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
      appBar: AppBar(title: const Text('Documents')),
      body: StreamBuilder<QuerySnapshot<Map<String, dynamic>>>(
        stream: FirebaseFirestore.instance.collection('documents').where('projectId', isEqualTo: projectId).snapshots(),
        builder: (context, snap) {
          if (!snap.hasData) return const Center(child: CircularProgressIndicator());
          final docs = snap.data!.docs;
          return ListView.separated(
            itemCount: docs.length,
            separatorBuilder: (_, __) => const Divider(height: 1),
            itemBuilder: (context, i) {
              final d = docs[i].data();
              final pay = d['paymentUrl'] as String?;
              final fileUrl = d['fileUrl'] as String?;
              return ListTile(
                title: Text(d['title'] as String? ?? d['type'] as String? ?? 'Document'),
                subtitle: Text('${d['status'] ?? ''} · ${d['amount'] ?? ''}'),
                onTap: fileUrl == null || fileUrl.isEmpty
                    ? null
                    : () => launchUrl(Uri.parse(fileUrl), mode: LaunchMode.externalApplication),
                trailing: pay == null
                    ? (fileUrl == null ? null : const Icon(Icons.open_in_new))
                    : IconButton(
                        icon: const Icon(Icons.open_in_new),
                        onPressed: () => launchUrl(Uri.parse(pay), mode: LaunchMode.externalApplication),
                      ),
              );
            },
          );
        },
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
      appBar: AppBar(
        title: const Text('Gig board'),
        actions: [IconButton(onPressed: () => FirebaseAuth.instance.signOut(), icon: const Icon(Icons.logout))],
      ),
      body: StreamBuilder<QuerySnapshot<Map<String, dynamic>>>(
        stream: FirebaseFirestore.instance.collection('gigs').where('status', isEqualTo: 'open').snapshots(),
        builder: (context, snap) {
          if (!snap.hasData) return const Center(child: CircularProgressIndicator());
          final gigs = snap.data!.docs;
          return ListView.separated(
            itemCount: gigs.length,
            separatorBuilder: (_, __) => const Divider(height: 1),
            itemBuilder: (context, i) {
              final g = gigs[i].data();
              return ListTile(
                title: Text(g['title'] as String? ?? '', style: GoogleFonts.cormorantGaramond(fontSize: 20)),
                subtitle: Text(g['location'] as String? ?? g['discipline'] as String? ?? ''),
                onTap: () async {
                  await FirebaseFirestore.instance.collection('applications').add({
                    'gigId': gigs[i].id,
                    'applicantId': uid,
                    'applicantEmail': email,
                    'applicantName': email,
                    'status': 'pending',
                    'createdAt': DateTime.now().toIso8601String(),
                  });
                  if (context.mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Application sent')));
                  }
                },
              );
            },
          );
        },
      ),
    );
  }
}
