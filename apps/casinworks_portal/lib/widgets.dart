import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'theme.dart';

class PortalHeader extends StatelessWidget {
  const PortalHeader({super.key, this.onSignOut, this.onBook});
  final VoidCallback? onSignOut;
  final VoidCallback? onBook;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(24, 16, 24, 16),
      decoration: const BoxDecoration(
        color: cream,
        border: Border(bottom: BorderSide(color: hairline)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('CasinWorks', style: GoogleFonts.dmSans(fontSize: 17, fontWeight: FontWeight.w600, color: ink)),
                const SizedBox(height: 2),
                Text('CLIENT PORTAL', style: kickerStyle.copyWith(fontSize: 10, letterSpacing: 2)),
              ],
            ),
          ),
          Row(
            children: [
              if (onBook != null) ...[
                GestureDetector(
                  onTap: onBook,
                  child: Text('Book', style: GoogleFonts.dmSans(fontSize: 13, fontWeight: FontWeight.w500, color: ink)),
                ),
                const SizedBox(width: 16),
              ],
              if (onSignOut != null)
                GestureDetector(
                  onTap: onSignOut,
                  child: Text('Sign out', style: GoogleFonts.dmSans(fontSize: 13, fontWeight: FontWeight.w500, color: slate)),
                ),
            ],
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
  });

  final String label;
  final TextEditingController controller;
  final bool obscure;
  final TextInputType? keyboardType;
  final bool readOnly;

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
          cursorColor: ink,
          style: GoogleFonts.dmSans(fontSize: 14, color: ink),
        ),
      ],
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
          child: Row(
            children: [
              _seg('client', 'I’m a client'),
              _seg('subcontractor', 'I’m looking for work'),
            ],
          ),
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
          decoration: BoxDecoration(
            color: on ? ink : Colors.transparent,
            borderRadius: BorderRadius.circular(999),
          ),
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
              decoration: BoxDecoration(
                color: on ? ink : Colors.transparent,
                borderRadius: BorderRadius.circular(999),
              ),
              child: Text(
                opt.$2,
                style: GoogleFonts.dmSans(
                  fontSize: 12,
                  fontWeight: FontWeight.w500,
                  color: on ? Colors.white : slate,
                ),
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
      decoration: BoxDecoration(
        color: current ? ink : panel,
        borderRadius: BorderRadius.circular(999),
      ),
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
