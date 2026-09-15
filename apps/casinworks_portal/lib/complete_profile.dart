import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import 'account.dart';
import 'theme.dart';
import 'widgets.dart';

/// First-time Apple/Google (or any Auth-without-profile) users pick client vs subcontractor here.
class CompleteProfilePage extends StatefulWidget {
  const CompleteProfilePage({super.key});

  @override
  State<CompleteProfilePage> createState() => _CompleteProfilePageState();
}

class _CompleteProfilePageState extends State<CompleteProfilePage> {
  final company = TextEditingController();
  String? role;
  bool acceptedPrivacy = false;
  bool sending = false;
  String? error;

  @override
  void dispose() {
    company.dispose();
    super.dispose();
  }

  Future<void> _signOut() async {
    await FirebaseAuth.instance.signOut();
  }

  Future<void> _continue() async {
    final user = FirebaseAuth.instance.currentUser;
    if (user == null) return;

    setState(() {
      sending = true;
      error = null;
    });
    try {
      final picked = role;
      if (picked == null) throw Exception('Choose how you will use the portal.');
      if (!acceptedPrivacy) throw Exception('Please agree to how your details are stored.');
      if (picked == 'client' && company.text.trim().isEmpty) {
        throw Exception('Enter your company.');
      }

      final email = (user.email ?? '').trim().toLowerCase();
      if (email.isEmpty) throw Exception('Apple did not provide an email for this account.');

      var displayName = (user.displayName ?? '').trim();
      if (displayName.isEmpty) {
        displayName = email.contains('@') ? email.split('@').first : 'CasinWorks user';
        await user.updateDisplayName(displayName);
      }

      await FirebaseFirestore.instance.collection('users').doc(user.uid).set({
        'email': email,
        'displayName': displayName,
        'role': picked,
        if (picked == 'client') 'company': company.text.trim(),
        'privacyAcceptedAt': DateTime.now().toUtc().toIso8601String(),
      });
    } catch (e) {
      if (mounted) {
        setState(() => error = e is Exception ? e.toString().replaceFirst('Exception: ', '') : '$e');
      }
    } finally {
      if (mounted) setState(() => sending = false);
    }
  }

  bool get canContinue {
    if (role == null || !acceptedPrivacy || sending) return false;
    if (role == 'client' && company.text.trim().isEmpty) return false;
    return true;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: cream,
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(24, 28, 24, 40),
          children: [
            Text('WELCOME', style: kickerStyle),
            const SizedBox(height: 8),
            RichText(
              text: TextSpan(
                style: displayStyle(36),
                children: [
                  const TextSpan(text: 'How will you use '),
                  TextSpan(
                    text: 'the portal.',
                    style: displayStyle(36).copyWith(fontStyle: FontStyle.italic, color: slate),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 12),
            Text(
              'Pick once. Client accounts follow engagements; subcontractors see open postings.',
              style: bodyStyle,
            ),
            const SizedBox(height: 28),
            _RolePanel(
              selected: role == 'client',
              title: 'Client',
              body: 'Project progress, documents, invoices.',
              onTap: () => setState(() => role = 'client'),
            ),
            const SizedBox(height: 12),
            _RolePanel(
              selected: role == 'subcontractor',
              title: 'Looking for work',
              body: 'Subcontractor board and applications.',
              onTap: () => setState(() => role = 'subcontractor'),
            ),
            if (role == 'client') ...[
              const SizedBox(height: 24),
              PortalField(
                label: 'Company',
                controller: company,
                onChanged: (_) => setState(() {}),
              ),
            ],
            const SizedBox(height: 24),
            PrivacyConsent(
              accepted: acceptedPrivacy,
              onChanged: (v) => setState(() {
                acceptedPrivacy = v;
                error = null;
              }),
            ),
            if (error != null) ...[
              const SizedBox(height: 14),
              Text(error!, style: GoogleFonts.dmSans(fontSize: 13, color: errorRed)),
            ],
            const SizedBox(height: 28),
            PortalPillButton(
              label: sending ? 'Please wait…' : 'Continue',
              enabled: canContinue,
              onPressed: _continue,
            ),
            const SizedBox(height: 16),
            Center(
              child: TextButton(
                onPressed: sending ? null : _signOut,
                child: Text(
                  'Sign out',
                  style: GoogleFonts.dmSans(fontSize: 14, fontWeight: FontWeight.w500, color: slate),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _RolePanel extends StatelessWidget {
  const _RolePanel({
    required this.selected,
    required this.title,
    required this.body,
    required this.onTap,
  });

  final bool selected;
  final String title;
  final String body;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 160),
          width: double.infinity,
          padding: const EdgeInsets.fromLTRB(18, 18, 18, 18),
          decoration: BoxDecoration(
            color: selected ? ink : Colors.white,
            border: Border.all(color: selected ? ink : fieldBorder),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: GoogleFonts.dmSans(
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                  color: selected ? Colors.white : ink,
                ),
              ),
              const SizedBox(height: 6),
              Text(
                body,
                style: GoogleFonts.dmSans(
                  fontSize: 13,
                  height: 1.4,
                  color: selected ? Colors.white.withValues(alpha: 0.78) : slate,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
