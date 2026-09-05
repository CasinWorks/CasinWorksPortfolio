import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:url_launcher/url_launcher.dart';

import 'credentials.dart';
import 'push.dart';
import 'theme.dart';
import 'widgets.dart';

const privacyPolicyUrl = 'https://www.casinworks.com/privacy.html';

/// What CasinWorks keeps for a portal account, shown before sign-up and again
/// on the account screen.
const storedDataNotice =
    'CasinWorks stores your name, email address, and company so your account can be '
    'attached to the right engagement and so consultation requests can be answered. '
    'Nothing is sold, and nothing is shared for advertising.';

Future<void> openPrivacyPolicy() {
  return launchUrl(Uri.parse(privacyPolicyUrl), mode: LaunchMode.externalApplication);
}

/// Removes everything held for [user] that belongs to them alone, then deletes
/// the sign-in itself. Records issued against an engagement are business and tax
/// records and stay with CasinWorks.
Future<void> deleteAccountData(User user) async {
  final db = FirebaseFirestore.instance;

  final consultations = await db.collection('consultations').where('clientUid', isEqualTo: user.uid).get();
  for (final doc in consultations.docs) {
    await doc.reference.delete();
  }

  final applications = await db.collection('applications').where('applicantId', isEqualTo: user.uid).get();
  for (final doc in applications.docs) {
    await doc.reference.delete();
  }

  await db.collection('users').doc(user.uid).delete();
  await user.delete();
}

/// Sign-up consent. Apple asks that an account-creating app say plainly what it
/// keeps before the account exists.
class PrivacyConsent extends StatelessWidget {
  const PrivacyConsent({super.key, required this.accepted, required this.onChanged});
  final bool accepted;
  final ValueChanged<bool> onChanged;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () => onChanged(!accepted),
      behavior: HitTestBehavior.opaque,
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 20,
            height: 20,
            margin: const EdgeInsets.only(top: 2),
            decoration: BoxDecoration(
              color: accepted ? ink : Colors.white,
              border: Border.all(color: accepted ? ink : fieldBorder),
            ),
            child: accepted ? const Icon(Icons.check, size: 14, color: Colors.white) : null,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'I agree that CasinWorks stores my name, email address, and company to run '
                  'this portal account.',
                  style: bodyStyle.copyWith(fontSize: 13),
                ),
                const SizedBox(height: 6),
                GestureDetector(
                  onTap: openPrivacyPolicy,
                  child: Text(
                    'Read the privacy policy',
                    style: GoogleFonts.dmSans(
                      fontSize: 13,
                      fontWeight: FontWeight.w500,
                      color: ink,
                      decoration: TextDecoration.underline,
                    ),
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  'You can delete the account and this information at any time from Account.',
                  style: GoogleFonts.dmSans(fontSize: 12, color: slate),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class AccountPage extends StatefulWidget {
  const AccountPage({super.key});

  @override
  State<AccountPage> createState() => _AccountPageState();
}

class _AccountPageState extends State<AccountPage> {
  String? error;
  bool working = false;

  Future<void> _signOut() async {
    await PushService.instance.stop();
    await FirebaseAuth.instance.signOut();
    if (mounted) Navigator.of(context).popUntil((route) => route.isFirst);
  }

  Future<void> _confirmDelete() async {
    final user = FirebaseAuth.instance.currentUser;
    if (user == null) return;

    final password = await showDialog<String>(context: context, builder: (_) => const _DeleteAccountDialog());
    if (password == null || !mounted) return;

    setState(() {
      working = true;
      error = null;
    });
    try {
      final email = user.email;
      if (email == null || email.isEmpty) {
        throw Exception('This account has no email address to confirm against.');
      }
      await user.reauthenticateWithCredential(EmailAuthProvider.credential(email: email, password: password));
      // Unregister the device before the account goes, while the rules still
      // allow writing to the user document.
      await PushService.instance.stop();
      await deleteAccountData(user);
      await CredentialStore.clear();
      if (mounted) Navigator.of(context).popUntil((route) => route.isFirst);
    } on FirebaseAuthException catch (e) {
      final message = e.code == 'invalid-credential' || e.code == 'wrong-password'
          ? 'That password did not match. Your account was not deleted.'
          : e.message ?? 'Could not delete the account.';
      if (mounted) setState(() => error = message);
    } catch (e) {
      if (mounted) setState(() => error = e.toString());
    } finally {
      if (mounted) setState(() => working = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = FirebaseAuth.instance.currentUser;
    final workspace = PortalGuideScope.maybeOf(context)?.session?.workspaceLabel ?? 'Client';

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
                  child: Text('← Back', style: GoogleFonts.dmSans(fontSize: 13, color: slate)),
                ),
              ),
            ),
            Expanded(
              child: ListView(
                padding: const EdgeInsets.fromLTRB(24, 8, 24, 40),
                children: [
                  Text('ACCOUNT', style: kickerStyle),
                  const SizedBox(height: 8),
                  Text('Your account.', style: displayStyle(32)),
                  const SizedBox(height: 20),
                  const Divider(height: 1, color: hairline),
                  _Row(label: 'Email', value: user?.email ?? '—'),
                  const Divider(height: 1, color: hairline),
                  _Row(label: 'Name', value: (user?.displayName ?? '').isEmpty ? '—' : user!.displayName!),
                  const Divider(height: 1, color: hairline),
                  _Row(label: 'Workspace', value: workspace),
                  const Divider(height: 1, color: hairline),
                  const SizedBox(height: 28),
                  Text('WHAT IS STORED', style: kickerStyle),
                  const SizedBox(height: 10),
                  Text(storedDataNotice, style: bodyStyle),
                  const SizedBox(height: 14),
                  Align(
                    alignment: Alignment.centerLeft,
                    child: GestureDetector(
                      onTap: openPrivacyPolicy,
                      child: Text(
                        'Read the privacy policy',
                        style: GoogleFonts.dmSans(
                          fontSize: 14,
                          fontWeight: FontWeight.w500,
                          color: ink,
                          decoration: TextDecoration.underline,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 32),
                  OutlinedButton(
                    onPressed: working ? null : _signOut,
                    style: OutlinedButton.styleFrom(
                      foregroundColor: ink,
                      side: const BorderSide(color: fieldBorder),
                      padding: const EdgeInsets.symmetric(vertical: 15),
                      shape: const StadiumBorder(),
                      textStyle: GoogleFonts.dmSans(fontSize: 14, fontWeight: FontWeight.w600),
                    ),
                    child: const Text('Sign out'),
                  ),
                  const SizedBox(height: 36),
                  const Divider(height: 1, color: hairline),
                  const SizedBox(height: 24),
                  Text('DELETE ACCOUNT', style: kickerStyle.copyWith(color: blocked)),
                  const SizedBox(height: 10),
                  Text(
                    'Deleting your account removes your profile, your consultation requests, and any '
                    'subcontractor applications, and signs you out everywhere. This cannot be undone.',
                    style: bodyStyle,
                  ),
                  const SizedBox(height: 10),
                  Text(
                    'Quotations, purchase orders, invoices, and remittances already issued for an '
                    'engagement are kept by CasinWorks as business and tax records.',
                    style: bodyStyle,
                  ),
                  if (error != null) ...[
                    const SizedBox(height: 14),
                    Text(error!, style: GoogleFonts.dmSans(fontSize: 13, color: errorRed)),
                  ],
                  const SizedBox(height: 18),
                  FilledButton(
                    onPressed: working ? null : _confirmDelete,
                    style: FilledButton.styleFrom(
                      backgroundColor: blocked,
                      foregroundColor: Colors.white,
                      disabledBackgroundColor: blocked.withValues(alpha: 0.4),
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      shape: const StadiumBorder(),
                      textStyle: GoogleFonts.dmSans(fontSize: 14, fontWeight: FontWeight.w600),
                      elevation: 0,
                    ),
                    child: Text(working ? 'Deleting…' : 'Delete my account'),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _Row extends StatelessWidget {
  const _Row({required this.label, required this.value});
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 16),
      child: Row(
        children: [
          SizedBox(width: 110, child: Text(label.toUpperCase(), style: kickerStyle)),
          Expanded(
            child: Text(
              value,
              textAlign: TextAlign.right,
              style: GoogleFonts.dmSans(fontSize: 14, fontWeight: FontWeight.w500, color: ink),
            ),
          ),
        ],
      ),
    );
  }
}

class _DeleteAccountDialog extends StatefulWidget {
  const _DeleteAccountDialog();

  @override
  State<_DeleteAccountDialog> createState() => _DeleteAccountDialogState();
}

class _DeleteAccountDialogState extends State<_DeleteAccountDialog> {
  final password = TextEditingController();
  bool ready = false;

  @override
  void dispose() {
    password.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      backgroundColor: cream,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.zero),
      insetPadding: const EdgeInsets.symmetric(horizontal: 24, vertical: 40),
      child: Padding(
        padding: const EdgeInsets.all(22),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('CONFIRM', style: kickerStyle),
            const SizedBox(height: 8),
            Text('Delete your account.', style: displayStyle(26)),
            const SizedBox(height: 12),
            Text(
              'Enter your password to confirm. Your profile, consultation requests, and '
              'applications are removed for good.',
              style: bodyStyle.copyWith(fontSize: 13),
            ),
            const SizedBox(height: 18),
            PortalField(
              label: 'Password',
              controller: password,
              obscure: true,
              onChanged: (v) => setState(() => ready = v.isNotEmpty),
            ),
            const SizedBox(height: 20),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: () => Navigator.pop(context),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: ink,
                      side: const BorderSide(color: fieldBorder),
                      padding: const EdgeInsets.symmetric(vertical: 13),
                      shape: const StadiumBorder(),
                      textStyle: GoogleFonts.dmSans(fontSize: 13, fontWeight: FontWeight.w600),
                    ),
                    child: const Text('Keep it'),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: FilledButton(
                    onPressed: ready ? () => Navigator.pop(context, password.text) : null,
                    style: FilledButton.styleFrom(
                      backgroundColor: blocked,
                      foregroundColor: Colors.white,
                      disabledBackgroundColor: blocked.withValues(alpha: 0.4),
                      padding: const EdgeInsets.symmetric(vertical: 13),
                      shape: const StadiumBorder(),
                      textStyle: GoogleFonts.dmSans(fontSize: 13, fontWeight: FontWeight.w600),
                      elevation: 0,
                    ),
                    child: const Text('Delete'),
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
