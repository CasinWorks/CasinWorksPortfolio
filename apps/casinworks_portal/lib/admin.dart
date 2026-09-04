import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:url_launcher/url_launcher.dart';

import 'book.dart' show formatWhen;
import 'theme.dart';
import 'widgets.dart';

/// Page chrome shared by the admin screens: header, back link, and intro copy.
class _AdminPage extends StatelessWidget {
  const _AdminPage({
    required this.kicker,
    required this.title,
    required this.intro,
    required this.children,
  });

  final String kicker;
  final String title;
  final String intro;
  final List<Widget> children;

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
                  child: Text('← Back', style: GoogleFonts.dmSans(fontSize: 13, color: slate)),
                ),
              ),
            ),
            Expanded(
              child: ListView(
                padding: const EdgeInsets.fromLTRB(24, 8, 24, 40),
                children: [
                  Text(kicker, style: kickerStyle),
                  const SizedBox(height: 8),
                  Text(title, style: displayStyle(32)),
                  const SizedBox(height: 10),
                  Text(intro, style: bodyStyle),
                  const SizedBox(height: 24),
                  ...children,
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

void _toast(BuildContext context, String message) {
  ScaffoldMessenger.of(context).showSnackBar(
    SnackBar(
      backgroundColor: ink,
      content: Text(message, style: GoogleFonts.dmSans(color: Colors.white)),
    ),
  );
}

class _SmallButton extends StatelessWidget {
  const _SmallButton({required this.label, required this.onPressed, this.filled = true});
  final String label;
  final VoidCallback? onPressed;
  final bool filled;

  @override
  Widget build(BuildContext context) {
    if (!filled) {
      return OutlinedButton(
        onPressed: onPressed,
        style: OutlinedButton.styleFrom(
          foregroundColor: ink,
          side: const BorderSide(color: fieldBorder),
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
          shape: const StadiumBorder(),
          textStyle: GoogleFonts.dmSans(fontSize: 12, fontWeight: FontWeight.w600),
        ),
        child: Text(label),
      );
    }
    return FilledButton(
      onPressed: onPressed,
      style: FilledButton.styleFrom(
        backgroundColor: ink,
        foregroundColor: Colors.white,
        disabledBackgroundColor: ink.withValues(alpha: 0.4),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
        shape: const StadiumBorder(),
        textStyle: GoogleFonts.dmSans(fontSize: 12, fontWeight: FontWeight.w600),
        elevation: 0,
      ),
      child: Text(label),
    );
  }
}

class _SectionTitle extends StatelessWidget {
  const _SectionTitle(this.title, {this.note});
  final String title;
  final String? note;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(title, style: displayStyle(24)),
        if (note != null) ...[
          const SizedBox(height: 6),
          Text(note!, style: bodyStyle.copyWith(fontSize: 13)),
        ],
        const SizedBox(height: 12),
      ],
    );
  }
}

// ---------------------------------------------------------------- Users

/// Everyone who has created a portal login. Converting one adds it to Clients,
/// which is what lets a project be attached to them.
class UsersPage extends StatelessWidget {
  const UsersPage({super.key});

  @override
  Widget build(BuildContext context) {
    final db = FirebaseFirestore.instance;
    return _AdminPage(
      kicker: 'ADMIN',
      title: 'Registered accounts.',
      intro: 'People who signed up for a portal login. Convert one when they become your '
          'client — that adds them to Clients so a project can be started for them.',
      children: [
        StreamBuilder<QuerySnapshot<Map<String, dynamic>>>(
          stream: db.collection('users').snapshots(),
          builder: (context, users) {
            if (!users.hasData) {
              return const Padding(
                padding: EdgeInsets.symmetric(vertical: 40),
                child: Center(child: CircularProgressIndicator()),
              );
            }
            return StreamBuilder<QuerySnapshot<Map<String, dynamic>>>(
              stream: db.collection('clients').snapshots(),
              builder: (context, clients) {
                final clientEmails = <String, String>{
                  for (final doc in clients.data?.docs ?? const <QueryDocumentSnapshot<Map<String, dynamic>>>[])
                    ((doc.data()['email'] as String?) ?? '').trim().toLowerCase(): doc.id,
                };
                final accounts =
                    users.data!.docs.where((d) => (d.data()['role'] as String?) != 'admin').toList()
                      ..sort((a, b) {
                        final an = (a.data()['displayName'] as String?) ?? '';
                        final bn = (b.data()['displayName'] as String?) ?? '';
                        return an.toLowerCase().compareTo(bn.toLowerCase());
                      });

                return HairlineList(
                  empty: Text('No registrations yet.', style: bodyStyle),
                  children: accounts
                      .map(
                        (doc) => _UserRow(
                          uid: doc.id,
                          data: doc.data(),
                          existingClientId: clientEmails[((doc.data()['email'] as String?) ?? '')
                              .trim()
                              .toLowerCase()],
                        ),
                      )
                      .toList(),
                );
              },
            );
          },
        ),
      ],
    );
  }
}

class _UserRow extends StatefulWidget {
  const _UserRow({required this.uid, required this.data, this.existingClientId});
  final String uid;
  final Map<String, dynamic> data;
  final String? existingClientId;

  @override
  State<_UserRow> createState() => _UserRowState();
}

class _UserRowState extends State<_UserRow> {
  bool busy = false;

  Future<void> _addAsClient() async {
    setState(() => busy = true);
    try {
      final email = ((widget.data['email'] as String?) ?? '').trim().toLowerCase();
      final name = ((widget.data['displayName'] as String?) ?? '').trim();
      final company = ((widget.data['company'] as String?) ?? '').trim();
      final db = FirebaseFirestore.instance;

      // Same shape the web portal writes, so both sides read one directory.
      final existing = await db.collection('clients').where('email', isEqualTo: email).limit(1).get();
      if (existing.docs.isNotEmpty) {
        await existing.docs.first.reference.update({'authUid': widget.uid});
      } else {
        await db.collection('clients').add({
          'company': company.isEmpty ? (name.isEmpty ? email : name) : company,
          'contactName': name.isEmpty ? email : name,
          'email': email,
          'phone': '',
          'address': '',
          'notes': '',
          'authUid': widget.uid,
          'createdAt': FieldValue.serverTimestamp(),
        });
      }
      if (mounted) _toast(context, 'Added to Clients.');
    } catch (e) {
      if (mounted) _toast(context, 'Could not add this account as a client.');
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final email = ((widget.data['email'] as String?) ?? '').trim();
    final name = ((widget.data['displayName'] as String?) ?? '').trim();
    final company = ((widget.data['company'] as String?) ?? '').trim();
    final role = (widget.data['role'] as String?) ?? 'client';

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 18),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            name.isEmpty ? email : name,
            style: GoogleFonts.dmSans(fontSize: 15, fontWeight: FontWeight.w600, color: ink),
          ),
          const SizedBox(height: 4),
          Text(company.isEmpty ? 'Company not set' : company, style: bodyStyle.copyWith(fontSize: 13)),
          const SizedBox(height: 2),
          Text(
            '$email · ${role == 'subcontractor' ? 'Subcontractor' : 'Client account'}',
            style: GoogleFonts.dmSans(fontSize: 12, color: slate),
          ),
          const SizedBox(height: 12),
          if (widget.existingClientId != null)
            Text(
              'Already in Clients',
              style: GoogleFonts.dmSans(fontSize: 12, fontWeight: FontWeight.w600, color: slate),
            )
          else if (role == 'client')
            Align(
              alignment: Alignment.centerLeft,
              child: _SmallButton(
                label: busy ? 'Adding…' : 'Add as client',
                onPressed: busy ? null : _addAsClient,
              ),
            )
          else
            Text('Not a client account', style: GoogleFonts.dmSans(fontSize: 12, color: slateMuted)),
        ],
      ),
    );
  }
}

// -------------------------------------------------------------- Clients

/// The client directory a project gets attached to.
class ClientsPage extends StatelessWidget {
  const ClientsPage({super.key});

  @override
  Widget build(BuildContext context) {
    return _AdminPage(
      kicker: 'ADMIN',
      title: 'Clients.',
      intro: 'Add the company here, or convert a registered login from Users. Projects are '
          'attached to a client on the web portal.',
      children: [
        Align(
          alignment: Alignment.centerLeft,
          child: _SmallButton(
            label: 'New client',
            onPressed: () => Navigator.push(
              context,
              MaterialPageRoute<void>(builder: (_) => const NewClientPage()),
            ),
          ),
        ),
        const SizedBox(height: 28),
        const _SectionTitle('Directory'),
        StreamBuilder<QuerySnapshot<Map<String, dynamic>>>(
          stream: FirebaseFirestore.instance.collection('clients').snapshots(),
          builder: (context, snap) {
            if (!snap.hasData) {
              return const Padding(
                padding: EdgeInsets.symmetric(vertical: 40),
                child: Center(child: CircularProgressIndicator()),
              );
            }
            final clients = [...snap.data!.docs]..sort((a, b) {
              final ac = ((a.data()['company'] as String?) ?? '').toLowerCase();
              final bc = ((b.data()['company'] as String?) ?? '').toLowerCase();
              return ac.compareTo(bc);
            });
            return HairlineList(
              empty: Text('No clients yet. Add one above.', style: bodyStyle),
              children: clients.map((doc) {
                final c = doc.data();
                final company = ((c['company'] as String?) ?? '').trim();
                final contact = ((c['contactName'] as String?) ?? '').trim();
                final email = ((c['email'] as String?) ?? '').trim();
                final phone = ((c['phone'] as String?) ?? '').trim();
                final address = ((c['address'] as String?) ?? '').trim();
                return Theme(
                  data: Theme.of(context).copyWith(dividerColor: Colors.transparent),
                  child: ExpansionTile(
                    tilePadding: EdgeInsets.zero,
                    childrenPadding: const EdgeInsets.only(bottom: 16),
                    title: Text(
                      company.isEmpty ? contact : company,
                      style: GoogleFonts.dmSans(fontSize: 15, fontWeight: FontWeight.w600, color: ink),
                    ),
                    subtitle: Padding(
                      padding: const EdgeInsets.only(top: 4),
                      child: Text(
                        [contact, email].where((v) => v.isNotEmpty).join(' · '),
                        style: GoogleFonts.dmSans(fontSize: 12, color: slate),
                      ),
                    ),
                    children: [
                      if (email.isNotEmpty)
                        _ContactLine(
                          label: 'Email',
                          value: email,
                          onTap: () => launchUrl(Uri.parse('mailto:$email')),
                        ),
                      if (phone.isNotEmpty)
                        _ContactLine(
                          label: 'Phone',
                          value: phone,
                          onTap: () => launchUrl(Uri.parse('tel:$phone')),
                        ),
                      if (address.isNotEmpty) _ContactLine(label: 'Address', value: address),
                    ],
                  ),
                );
              }).toList(),
            );
          },
        ),
      ],
    );
  }
}

class _ContactLine extends StatelessWidget {
  const _ContactLine({required this.label, required this.value, this.onTap});
  final String label;
  final String value;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 8),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            SizedBox(width: 90, child: Text(label.toUpperCase(), style: kickerStyle)),
            Expanded(
              child: Text(
                value,
                style: GoogleFonts.dmSans(
                  fontSize: 13,
                  color: ink,
                  decoration: onTap == null ? null : TextDecoration.underline,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class NewClientPage extends StatefulWidget {
  const NewClientPage({super.key});

  @override
  State<NewClientPage> createState() => _NewClientPageState();
}

class _NewClientPageState extends State<NewClientPage> {
  final company = TextEditingController();
  final contactName = TextEditingController();
  final email = TextEditingController();
  final phone = TextEditingController();
  final address = TextEditingController();
  String? error;
  bool saving = false;

  @override
  void dispose() {
    company.dispose();
    contactName.dispose();
    email.dispose();
    phone.dispose();
    address.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    setState(() {
      saving = true;
      error = null;
    });
    try {
      if (company.text.trim().isEmpty) throw Exception('Enter the company.');
      if (contactName.text.trim().isEmpty) throw Exception('Enter the contact person.');
      if (email.text.trim().isEmpty) throw Exception('Enter an email address.');

      final normalised = email.text.trim().toLowerCase();
      final db = FirebaseFirestore.instance;
      // Link the login straight away when one already exists for this address.
      final match = await db.collection('users').where('email', isEqualTo: normalised).limit(1).get();

      await db.collection('clients').add({
        'company': company.text.trim(),
        'contactName': contactName.text.trim(),
        'email': normalised,
        'phone': phone.text.trim(),
        'address': address.text.trim(),
        'notes': '',
        'authUid': match.docs.isEmpty ? '' : match.docs.first.id,
        'createdAt': FieldValue.serverTimestamp(),
      });

      if (!mounted) return;
      _toast(context, '${company.text.trim()} added.');
      Navigator.pop(context);
    } catch (e) {
      if (mounted) {
        setState(() => error = e is Exception ? e.toString().replaceFirst('Exception: ', '') : '$e');
      }
    } finally {
      if (mounted) setState(() => saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return _AdminPage(
      kicker: 'ADMIN',
      title: 'New client.',
      intro: 'The company a project gets billed to. Email matters most — it is how a portal '
          'login is matched to this client.',
      children: [
        PortalField(label: 'Company', controller: company),
        const SizedBox(height: 16),
        PortalField(label: 'Contact person', controller: contactName),
        const SizedBox(height: 16),
        PortalField(label: 'Email', controller: email, keyboardType: TextInputType.emailAddress),
        const SizedBox(height: 16),
        PortalField(label: 'Phone', controller: phone, keyboardType: TextInputType.phone),
        const SizedBox(height: 16),
        PortalField(label: 'Address', controller: address),
        if (error != null) ...[
          const SizedBox(height: 14),
          Text(error!, style: GoogleFonts.dmSans(fontSize: 13, color: errorRed)),
        ],
        const SizedBox(height: 24),
        PortalPillButton(
          label: saving ? 'Saving…' : 'Add client',
          enabled: !saving,
          onPressed: _save,
        ),
      ],
    );
  }
}

// ---------------------------------------------------------- Admin inbox

/// What needs a decision: consultation requests, client uploads, and gig posting.
class AdminInboxPage extends StatelessWidget {
  const AdminInboxPage({super.key});

  @override
  Widget build(BuildContext context) {
    final db = FirebaseFirestore.instance;
    return _AdminPage(
      kicker: 'ADMIN',
      title: 'Inbox.',
      intro: 'Anything waiting on you. Day-to-day project work lives on the project itself — '
          'open it from Projects.',
      children: [
        const _SectionTitle(
          'Consultation requests',
          note: 'Clients ask for an hour from Book. Confirming holds the slot for them.',
        ),
        StreamBuilder<QuerySnapshot<Map<String, dynamic>>>(
          stream: db.collection('consultations').where('status', isEqualTo: 'requested').snapshots(),
          builder: (context, snap) {
            if (!snap.hasData) {
              return const Padding(
                padding: EdgeInsets.symmetric(vertical: 30),
                child: Center(child: CircularProgressIndicator()),
              );
            }
            final rows = [...snap.data!.docs]..sort(
              (a, b) => ((a.data()['startsAt'] as String?) ?? '').compareTo(
                (b.data()['startsAt'] as String?) ?? '',
              ),
            );
            return HairlineList(
              empty: Text('No open requests.', style: bodyStyle),
              children: rows.map((doc) {
                final c = doc.data();
                final startsAt = (c['startsAt'] as String?) ?? '';
                final hours = (c['hours'] as num?)?.toInt() ?? 1;
                final who = ((c['clientName'] as String?) ?? '').trim();
                final company = ((c['company'] as String?) ?? '').trim();
                final notes = ((c['notes'] as String?) ?? '').trim();
                return Padding(
                  padding: const EdgeInsets.symmetric(vertical: 18),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        startsAt.isEmpty ? 'Time not set' : formatWhen(DateTime.parse(startsAt)),
                        style: GoogleFonts.dmSans(fontSize: 15, fontWeight: FontWeight.w600, color: ink),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        [
                          if (who.isNotEmpty) who,
                          if (company.isNotEmpty) company,
                          '$hours hr${hours == 1 ? '' : 's'}',
                        ].join(' · '),
                        style: GoogleFonts.dmSans(fontSize: 12, color: slate),
                      ),
                      if (notes.isNotEmpty) ...[
                        const SizedBox(height: 8),
                        Text(notes, style: bodyStyle.copyWith(fontSize: 13)),
                      ],
                      const SizedBox(height: 12),
                      Row(
                        children: [
                          _SmallButton(
                            label: 'Confirm',
                            onPressed: () async {
                              await doc.reference.update({'status': 'confirmed'});
                              if (context.mounted) _toast(context, 'Consultation confirmed.');
                            },
                          ),
                          const SizedBox(width: 10),
                          _SmallButton(
                            label: 'Decline',
                            filled: false,
                            onPressed: () async {
                              await doc.reference.update({'status': 'cancelled'});
                              if (context.mounted) _toast(context, 'Consultation declined.');
                            },
                          ),
                        ],
                      ),
                    ],
                  ),
                );
              }).toList(),
            );
          },
        ),
        const SizedBox(height: 36),
        const _SectionTitle(
          'Waiting on you',
          note: 'Purchase orders and remittances a client uploaded against a project.',
        ),
        StreamBuilder<QuerySnapshot<Map<String, dynamic>>>(
          stream: db.collection('documents').where('status', isEqualTo: 'pending_review').snapshots(),
          builder: (context, snap) {
            if (!snap.hasData) {
              return const Padding(
                padding: EdgeInsets.symmetric(vertical: 30),
                child: Center(child: CircularProgressIndicator()),
              );
            }
            return HairlineList(
              empty: Text('Nothing waiting.', style: bodyStyle),
              children: snap.data!.docs.map((doc) {
                final d = doc.data();
                final fileUrl = ((d['fileUrl'] as String?) ?? '').trim();
                return Padding(
                  padding: const EdgeInsets.symmetric(vertical: 18),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        (d['title'] as String?) ?? (d['type'] as String?) ?? 'Document',
                        style: GoogleFonts.dmSans(fontSize: 15, fontWeight: FontWeight.w600, color: ink),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        [d['type'], d['date']].where((v) => v != null && '$v'.isNotEmpty).join(' · '),
                        style: GoogleFonts.dmSans(fontSize: 12, color: slate),
                      ),
                      const SizedBox(height: 12),
                      Row(
                        children: [
                          _SmallButton(
                            label: 'Confirm',
                            onPressed: () async {
                              await doc.reference.update({'status': 'confirmed'});
                              if (context.mounted) _toast(context, 'Marked confirmed.');
                            },
                          ),
                          if (fileUrl.isNotEmpty) ...[
                            const SizedBox(width: 10),
                            _SmallButton(
                              label: 'Open file',
                              filled: false,
                              onPressed: () =>
                                  launchUrl(Uri.parse(fileUrl), mode: LaunchMode.externalApplication),
                            ),
                          ],
                        ],
                      ),
                    ],
                  ),
                );
              }).toList(),
            );
          },
        ),
        const SizedBox(height: 36),
        const _SectionTitle('Post a gig', note: 'Publishes to the subcontractor board.'),
        Align(
          alignment: Alignment.centerLeft,
          child: _SmallButton(
            label: 'New posting',
            onPressed: () => Navigator.push(
              context,
              MaterialPageRoute<void>(builder: (_) => const PostGigPage()),
            ),
          ),
        ),
      ],
    );
  }
}

class PostGigPage extends StatefulWidget {
  const PostGigPage({super.key});

  @override
  State<PostGigPage> createState() => _PostGigPageState();
}

class _PostGigPageState extends State<PostGigPage> {
  final title = TextEditingController();
  final description = TextEditingController();
  final discipline = TextEditingController();
  final location = TextEditingController(text: 'Remote');
  final rate = TextEditingController();
  String? error;
  bool saving = false;

  @override
  void dispose() {
    title.dispose();
    description.dispose();
    discipline.dispose();
    location.dispose();
    rate.dispose();
    super.dispose();
  }

  Future<void> _publish() async {
    setState(() {
      saving = true;
      error = null;
    });
    try {
      if (title.text.trim().isEmpty) throw Exception('Enter a title.');
      if (description.text.trim().isEmpty) throw Exception('Enter a description.');

      final where = location.text.trim();
      final postedBy = PortalGuideScope.maybeOf(context)?.session?.displayName ?? 'CasinWorks';
      await FirebaseFirestore.instance.collection('gigs').add({
        'title': title.text.trim(),
        'description': description.text.trim(),
        'status': 'open',
        'postedBy': postedBy.isEmpty ? 'CasinWorks' : postedBy,
        if (discipline.text.trim().isNotEmpty) 'discipline': discipline.text.trim(),
        'location': where,
        'workType': where.toLowerCase().contains('remote') ? 'Remote' : 'Hybrid',
        if (rate.text.trim().isNotEmpty) 'rate': rate.text.trim(),
        'createdAt': FieldValue.serverTimestamp(),
      });

      if (!mounted) return;
      _toast(context, 'Gig posted.');
      Navigator.pop(context);
    } catch (e) {
      if (mounted) {
        setState(() => error = e is Exception ? e.toString().replaceFirst('Exception: ', '') : '$e');
      }
    } finally {
      if (mounted) setState(() => saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return _AdminPage(
      kicker: 'ADMIN',
      title: 'Post a gig.',
      intro: 'Goes straight onto the subcontractor board. Rates and contracts are still '
          'agreed off-platform.',
      children: [
        PortalField(label: 'Title', controller: title),
        const SizedBox(height: 16),
        PortalField(label: 'Discipline', controller: discipline),
        const SizedBox(height: 16),
        PortalField(label: 'Location', controller: location),
        const SizedBox(height: 16),
        PortalField(label: 'Rate', controller: rate),
        const SizedBox(height: 16),
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('DESCRIPTION', style: kickerStyle),
            const SizedBox(height: 8),
            TextField(
              controller: description,
              maxLines: 5,
              cursorColor: ink,
              style: GoogleFonts.dmSans(fontSize: 14, color: ink),
            ),
          ],
        ),
        if (error != null) ...[
          const SizedBox(height: 14),
          Text(error!, style: GoogleFonts.dmSans(fontSize: 13, color: errorRed)),
        ],
        const SizedBox(height: 24),
        PortalPillButton(
          label: saving ? 'Publishing…' : 'Publish',
          enabled: !saving,
          onPressed: _publish,
        ),
      ],
    );
  }
}
