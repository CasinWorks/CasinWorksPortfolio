import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'theme.dart';

/// The signed-in account, as far as the UI needs to know it.
class PortalSession {
  const PortalSession({
    required this.uid,
    required this.email,
    required this.role,
    this.displayName = '',
    this.company = '',
  });

  final String uid;
  final String email;
  final String role;
  final String displayName;
  final String company;

  bool get isAdmin => role == 'admin';
  bool get isSubcontractor => role == 'subcontractor';

  /// Admins get the client-side screens as well, matching the web portal.
  bool get seesClientArea => role == 'admin' || role == 'client';
  bool get seesGigBoard => role == 'admin' || role == 'subcontractor';

  String get workspaceLabel => switch (role) {
    'admin' => 'Admin',
    'subcontractor' => 'Subcontractor',
    _ => 'Client',
  };

  @override
  bool operator ==(Object other) =>
      other is PortalSession &&
      other.uid == uid &&
      other.email == email &&
      other.role == role &&
      other.displayName == displayName &&
      other.company == company;

  @override
  int get hashCode => Object.hash(uid, email, role, displayName, company);
}

/// Everywhere the header menu can send you. Kept in step with the web portal's nav.
enum PortalDestination {
  projects,
  book,
  messages,
  gigs,
  clients,
  users,
  adminInbox,
  account,
  guide,
  website,
  signOut,
}

/// Menu entries for [session], in the order they appear.
List<(PortalDestination, String)> destinationsFor(PortalSession session) {
  return [
    if (session.seesClientArea) (PortalDestination.projects, 'Projects'),
    if (session.seesClientArea)
      (PortalDestination.book, session.isAdmin ? 'Consultation calendar' : 'Book a consultation'),
    (PortalDestination.messages, session.isAdmin ? 'Client messages' : 'Messages'),
    if (session.seesGigBoard) (PortalDestination.gigs, 'Gig board'),
    if (session.isAdmin) (PortalDestination.clients, 'Clients'),
    if (session.isAdmin) (PortalDestination.users, 'Users'),
    if (session.isAdmin) (PortalDestination.adminInbox, 'Admin inbox'),
    (PortalDestination.account, 'Account'),
    (PortalDestination.guide, 'Guide'),
    (PortalDestination.website, 'casinworks.com'),
    (PortalDestination.signOut, 'Sign out'),
  ];
}

class PortalGuideScope extends InheritedWidget {
  const PortalGuideScope({
    super.key,
    required this.session,
    required this.setSession,
    required this.go,
    this.unreadMessages,
    required super.child,
  });

  final PortalSession? session;
  final ValueChanged<PortalSession?> setSession;

  /// Routing lives in main.dart, which is the only place that knows every page.
  final Future<void> Function(BuildContext context, PortalDestination destination) go;

  /// Conversations waiting on this account. Supplied by main.dart so this file
  /// does not need to know how messages are stored.
  final Stream<int>? unreadMessages;

  String? get role => session?.role;

  static PortalGuideScope? maybeOf(BuildContext context) {
    return context.dependOnInheritedWidgetOfExactType<PortalGuideScope>();
  }

  @override
  bool updateShouldNotify(PortalGuideScope oldWidget) => session != oldWidget.session;
}

/// Small dark count used on the menu and its rows.
class UnreadBadge extends StatelessWidget {
  const UnreadBadge({super.key, required this.count});
  final int count;

  @override
  Widget build(BuildContext context) {
    return Container(
      constraints: const BoxConstraints(minWidth: 18),
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(color: ink, borderRadius: BorderRadius.circular(999)),
      child: Text(
        count > 9 ? '9+' : '$count',
        textAlign: TextAlign.center,
        style: GoogleFonts.dmSans(fontSize: 10, fontWeight: FontWeight.w700, color: Colors.white),
      ),
    );
  }
}

/// Opens the navigation sheet, then routes to whatever was picked.
Future<void> showPortalMenu(BuildContext context) async {
  final scope = PortalGuideScope.maybeOf(context);
  final session = scope?.session;
  if (scope == null || session == null) return;

  final picked = await showModalBottomSheet<PortalDestination>(
    context: context,
    backgroundColor: cream,
    barrierColor: Colors.black.withValues(alpha: 0.35),
    shape: const RoundedRectangleBorder(borderRadius: BorderRadius.zero),
    builder: (sheet) {
      final entries = destinationsFor(session);
      return SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(24, 20, 24, 14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(session.workspaceLabel.toUpperCase(), style: kickerStyle),
                  const SizedBox(height: 4),
                  Text(
                    session.displayName.isEmpty ? session.email : session.displayName,
                    style: GoogleFonts.dmSans(fontSize: 16, fontWeight: FontWeight.w600, color: ink),
                  ),
                ],
              ),
            ),
            const Divider(height: 1, color: hairline),
            Flexible(
              child: ListView.separated(
                shrinkWrap: true,
                padding: EdgeInsets.zero,
                itemCount: entries.length,
                separatorBuilder: (_, _) => const Divider(height: 1, color: hairline),
                itemBuilder: (_, i) {
                  final (destination, label) = entries[i];
                  final muted =
                      destination == PortalDestination.signOut ||
                      destination == PortalDestination.website ||
                      destination == PortalDestination.guide;
                  return InkWell(
                    onTap: () => Navigator.pop(sheet, destination),
                    child: Container(
                      constraints: const BoxConstraints(minHeight: 52),
                      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
                      alignment: Alignment.centerLeft,
                      child: Row(
                        children: [
                          Expanded(
                            child: Text(
                              label,
                              style: GoogleFonts.dmSans(
                                fontSize: 15,
                                fontWeight: FontWeight.w500,
                                color: muted ? slate : ink,
                              ),
                            ),
                          ),
                          if (destination == PortalDestination.messages)
                            _UnreadCount(stream: scope.unreadMessages),
                        ],
                      ),
                    ),
                  );
                },
              ),
            ),
          ],
        ),
      );
    },
  );

  if (picked == null || !context.mounted) return;
  await scope.go(context, picked);
}

/// Renders the badge only when there is something to show.
class _UnreadCount extends StatelessWidget {
  const _UnreadCount({required this.stream});
  final Stream<int>? stream;

  @override
  Widget build(BuildContext context) {
    if (stream == null) return const SizedBox.shrink();
    return StreamBuilder<int>(
      stream: stream,
      builder: (context, snap) {
        final count = snap.data ?? 0;
        if (count <= 0) return const SizedBox.shrink();
        return UnreadBadge(count: count);
      },
    );
  }
}

class PortalHeader extends StatelessWidget {
  const PortalHeader({super.key, this.subtitle});

  /// Defaults to the workspace the account is in.
  final String? subtitle;

  @override
  Widget build(BuildContext context) {
    final scope = PortalGuideScope.maybeOf(context);
    final session = scope?.session;
    final kicker = subtitle ?? (session == null ? 'CLIENT PORTAL' : '${session.workspaceLabel} PORTAL');

    return Container(
      padding: const EdgeInsets.fromLTRB(24, 12, 16, 12),
      decoration: const BoxDecoration(
        color: cream,
        border: Border(bottom: BorderSide(color: hairline)),
      ),
      child: Row(
        children: [
          Image.asset(
            'assets/icon/app_mark.png',
            height: 26,
            filterQuality: FilterQuality.medium,
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'CasinWorks',
                  style: GoogleFonts.dmSans(fontSize: 17, fontWeight: FontWeight.w600, color: ink),
                ),
                const SizedBox(height: 2),
                Text(
                  kicker.toUpperCase(),
                  style: kickerStyle.copyWith(fontSize: 10, letterSpacing: 2),
                ),
              ],
            ),
          ),
          if (session != null)
            InkWell(
              onTap: () => showPortalMenu(context),
              child: Container(
                constraints: const BoxConstraints(minWidth: 84, minHeight: 44),
                padding: const EdgeInsets.symmetric(horizontal: 14),
                decoration: BoxDecoration(
                  border: Border.all(color: fieldBorder),
                  borderRadius: BorderRadius.circular(999),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(Icons.menu, size: 16, color: ink),
                    const SizedBox(width: 7),
                    Text(
                      'Menu',
                      style: GoogleFonts.dmSans(fontSize: 13, fontWeight: FontWeight.w600, color: ink),
                    ),
                    // A waiting reply should be visible without opening the menu.
                    if (scope?.unreadMessages != null)
                      Padding(
                        padding: const EdgeInsets.only(left: 6),
                        child: _UnreadCount(stream: scope!.unreadMessages),
                      ),
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class PortalField extends StatelessWidget {
  const PortalField({
    super.key,
    required this.label,
    required this.controller,
    this.obscure = false,
    this.keyboardType,
    this.readOnly = false,
    this.onChanged,
  });

  final String label;
  final TextEditingController controller;
  final bool obscure;
  final TextInputType? keyboardType;
  final bool readOnly;
  final ValueChanged<String>? onChanged;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label.toUpperCase(), style: kickerStyle),
        const SizedBox(height: 8),
        TextField(
          controller: controller,
          obscureText: obscure,
          readOnly: readOnly,
          keyboardType: keyboardType,
          onChanged: onChanged,
          cursorColor: ink,
          style: GoogleFonts.dmSans(fontSize: 14, color: ink),
        ),
      ],
    );
  }
}

/// Square check box in the portal's hairline style.
class PortalCheckbox extends StatelessWidget {
  const PortalCheckbox({
    super.key,
    required this.value,
    required this.onChanged,
    required this.label,
    this.note,
  });

  final bool value;
  final ValueChanged<bool> onChanged;
  final String label;
  final String? note;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () => onChanged(!value),
      behavior: HitTestBehavior.opaque,
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 20,
            height: 20,
            margin: const EdgeInsets.only(top: 1),
            decoration: BoxDecoration(
              color: value ? ink : Colors.white,
              border: Border.all(color: value ? ink : fieldBorder),
            ),
            child: value ? const Icon(Icons.check, size: 14, color: Colors.white) : null,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: GoogleFonts.dmSans(fontSize: 14, fontWeight: FontWeight.w500, color: ink),
                ),
                if (note != null) ...[
                  const SizedBox(height: 4),
                  Text(note!, style: GoogleFonts.dmSans(fontSize: 12, height: 1.4, color: slate)),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class WorkspaceToggle extends StatelessWidget {
  const WorkspaceToggle({super.key, required this.role, required this.onChanged});
  final String role;
  final ValueChanged<String> onChanged;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('WORKSPACE', style: kickerStyle),
        const SizedBox(height: 8),
        Container(
          padding: const EdgeInsets.all(4),
          decoration: BoxDecoration(
            color: panel,
            border: Border.all(color: hairline),
            borderRadius: BorderRadius.circular(999),
          ),
          child: Row(children: [_seg('client', 'I’m a client'), _seg('subcontractor', 'I’m looking for work')]),
        ),
        const SizedBox(height: 8),
        Text(
          role == 'client'
              ? 'Project progress, documents, invoices, and remittances.'
              : 'Open subcontractor postings and applications.',
          style: GoogleFonts.dmSans(fontSize: 11, color: slate),
        ),
      ],
    );
  }

  Widget _seg(String value, String label) {
    final on = role == value;
    return Expanded(
      child: GestureDetector(
        onTap: () => onChanged(value),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 160),
          padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 8),
          decoration: BoxDecoration(color: on ? ink : Colors.transparent, borderRadius: BorderRadius.circular(999)),
          child: Text(
            label,
            textAlign: TextAlign.center,
            style: GoogleFonts.dmSans(
              fontSize: 12,
              fontWeight: FontWeight.w500,
              color: on ? Colors.white : const Color(0xFF475569),
            ),
          ),
        ),
      ),
    );
  }
}

class PortalSegmented extends StatelessWidget {
  const PortalSegmented({super.key, required this.value, required this.options, required this.onChanged});
  final String value;
  final List<(String id, String label)> options;
  final ValueChanged<String> onChanged;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: panel,
        border: Border.all(color: hairline),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: options.map((opt) {
          final on = value == opt.$1;
          return GestureDetector(
            onTap: () => onChanged(opt.$1),
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 160),
              padding: const EdgeInsets.symmetric(vertical: 7, horizontal: 14),
              decoration: BoxDecoration(color: on ? ink : Colors.transparent, borderRadius: BorderRadius.circular(999)),
              child: Text(
                opt.$2,
                style: GoogleFonts.dmSans(fontSize: 12, fontWeight: FontWeight.w500, color: on ? Colors.white : slate),
              ),
            ),
          );
        }).toList(),
      ),
    );
  }
}

class PortalPillButton extends StatelessWidget {
  const PortalPillButton({super.key, required this.label, required this.onPressed, this.enabled = true});
  final String label;
  final VoidCallback? onPressed;
  final bool enabled;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: double.infinity,
      child: FilledButton(
        onPressed: enabled ? onPressed : null,
        style: FilledButton.styleFrom(
          backgroundColor: ink,
          foregroundColor: Colors.white,
          disabledBackgroundColor: ink.withValues(alpha: 0.4),
          padding: const EdgeInsets.symmetric(vertical: 16),
          shape: const StadiumBorder(),
          textStyle: GoogleFonts.dmSans(fontSize: 14, fontWeight: FontWeight.w600),
          elevation: 0,
        ),
        child: Text(label),
      ),
    );
  }
}

class StatusPill extends StatelessWidget {
  const StatusPill({super.key, required this.label, this.current = false});
  final String label;
  final bool current;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
      decoration: BoxDecoration(color: current ? ink : panel, borderRadius: BorderRadius.circular(999)),
      child: Text(
        label,
        style: GoogleFonts.dmSans(
          fontSize: 11,
          fontWeight: FontWeight.w500,
          color: current ? Colors.white : const Color(0xFF475569),
        ),
      ),
    );
  }
}

class HairlineList extends StatelessWidget {
  const HairlineList({super.key, required this.children, this.empty});
  final List<Widget> children;
  final Widget? empty;

  @override
  Widget build(BuildContext context) {
    if (children.isEmpty) {
      return Padding(
        padding: const EdgeInsets.symmetric(vertical: 40),
        child: empty ?? Text('Nothing here yet.', style: bodyStyle),
      );
    }
    return Column(
      children: [
        const Divider(height: 1, color: hairline),
        ...children.expand((child) => [child, const Divider(height: 1, color: hairline)]),
      ],
    );
  }
}
