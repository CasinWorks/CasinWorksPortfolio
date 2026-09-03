import 'package:add_2_calendar/add_2_calendar.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:url_launcher/url_launcher.dart';

import 'theme.dart';
import 'widgets.dart';

const slotHours = [9, 10, 11, 13, 14, 15, 16];
const consultRate = 5000;

DateTime slotStart(String dateIso, int hour) {
  final h = hour.toString().padLeft(2, '0');
  return DateTime.parse('${dateIso}T$h:00:00+08:00');
}

bool durationFits(int startHour, int hours) {
  for (var i = 0; i < hours; i++) {
    if (!slotHours.contains(startHour + i)) return false;
  }
  return true;
}

bool isWeekday(String dateIso) {
  final day = slotStart(dateIso, 12).weekday; // 1 = Mon
  return day >= 1 && day <= 5;
}

String manilaDateIso(DateTime d) {
  final m = d.toUtc().add(const Duration(hours: 8));
  return '${m.year.toString().padLeft(4, '0')}-${m.month.toString().padLeft(2, '0')}-${m.day.toString().padLeft(2, '0')}';
}

String formatWhen(DateTime start) {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  final m = start.toUtc().add(const Duration(hours: 8));
  final hour = m.hour % 12 == 0 ? 12 : m.hour % 12;
  final ampm = m.hour >= 12 ? 'PM' : 'AM';
  return '${days[m.weekday - 1]}, ${months[m.month - 1]} ${m.day}, ${m.year} · $hour:00 $ampm';
}

String formatSlotHour(int hour) {
  final h = hour % 12 == 0 ? 12 : hour % 12;
  final ampm = hour >= 12 ? 'PM' : 'AM';
  return '$h:00 $ampm';
}

bool slotsOverlap(DateTime a0, int aHours, DateTime b0, int bHours) {
  final a1 = a0.add(Duration(hours: aHours));
  final b1 = b0.add(Duration(hours: bHours));
  return a0.isBefore(b1) && b0.isBefore(a1);
}

List<String?> monthGrid(int year, int month) {
  final first = DateTime.utc(year, month, 1);
  final startPad = (first.weekday + 6) % 7; // Monday = 0
  final daysInMonth = DateTime.utc(year, month + 1, 0).day;
  final cells = <String?>[];
  for (var i = 0; i < startPad; i++) {
    cells.add(null);
  }
  for (var d = 1; d <= daysInMonth; d++) {
    cells.add(
      '$year-${month.toString().padLeft(2, '0')}-${d.toString().padLeft(2, '0')}',
    );
  }
  while (cells.length % 7 != 0) {
    cells.add(null);
  }
  return cells;
}

Event consultEvent({required DateTime start, required int hours}) {
  final local = start.isUtc ? start.toLocal() : start;
  return Event(
    title: 'CasinWorks consultation',
    description: '$hours hour${hours == 1 ? '' : 's'} with Christian Joshua Casin. PHP ${consultRate.toString()}/hr.',
    location: 'Video call — CasinWorks',
    startDate: local,
    endDate: local.add(Duration(hours: hours)),
    timeZone: 'Asia/Manila',
  );
}

Uri googleCalendarUrl({required DateTime start, required int hours}) {
  String stamp(DateTime d) {
    final u = d.toUtc();
    String two(int n) => n.toString().padLeft(2, '0');
    return '${u.year}${two(u.month)}${two(u.day)}T${two(u.hour)}${two(u.minute)}${two(u.second)}Z';
  }

  final end = start.add(Duration(hours: hours));
  return Uri.https('calendar.google.com', '/calendar/render', {
    'action': 'TEMPLATE',
    'text': 'CasinWorks consultation',
    'dates': '${stamp(start)}/${stamp(end)}',
    'details': '$hours hour${hours == 1 ? '' : 's'} with Christian Joshua Casin.',
    'location': 'Video call — CasinWorks',
  });
}

class BookPage extends StatefulWidget {
  const BookPage({
    super.key,
    required this.uid,
    required this.email,
    required this.displayName,
    this.company = '',
    this.isAdmin = false,
    this.onSignOut,
  });
  final String uid;
  final String email;
  final String displayName;
  final String company;
  final bool isAdmin;
  final VoidCallback? onSignOut;

  @override
  State<BookPage> createState() => _BookPageState();
}

class _BookPageState extends State<BookPage> {
  late DateTime cursor;
  String? dateIso;
  int? hour;
  int hours = 1;
  final notes = TextEditingController();
  String? error;
  bool sending = false;

  @override
  void initState() {
    super.initState();
    final today = DateTime.parse('${manilaDateIso(DateTime.now())}T12:00:00+08:00');
    cursor = DateTime(today.year, today.month, 1);
  }

  @override
  void dispose() {
    notes.dispose();
    super.dispose();
  }

  Future<void> _saveToCalendar(DateTime start, int duration) async {
    try {
      await Add2Calendar.addEvent2Cal(consultEvent(start: start, hours: duration));
    } catch (e) {
      if (!mounted) return;
      setState(() => error = e.toString());
    }
  }

  @override
  Widget build(BuildContext context) {
    final todayIso = manilaDateIso(DateTime.now());
    final cells = monthGrid(cursor.year, cursor.month);
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    return Scaffold(
      backgroundColor: cream,
      body: SafeArea(
        child: Column(
          children: [
            PortalHeader(onSignOut: widget.onSignOut),
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 8, 24, 0),
              child: Align(
                alignment: Alignment.centerLeft,
                child: TextButton(
                  onPressed: () => Navigator.pop(context),
                  child: Text('← Projects', style: GoogleFonts.dmSans(fontSize: 13, color: slate)),
                ),
              ),
            ),
            Expanded(
              child: StreamBuilder<QuerySnapshot<Map<String, dynamic>>>(
                stream: FirebaseFirestore.instance.collection('consultations').snapshots(),
                builder: (context, snap) {
                  final docs = snap.data?.docs ?? [];
                  final live = docs.where((d) {
                    final s = d.data()['status'] as String? ?? '';
                    return s == 'requested' || s == 'confirmed';
                  }).toList();

                  bool taken(String day, int startHour, int duration) {
                    final start = slotStart(day, startHour);
                    return live.any((d) {
                      final otherStart = DateTime.tryParse(d.data()['startsAt'] as String? ?? '');
                      if (otherStart == null) return false;
                      final otherHours = (d.data()['hours'] as num?)?.toInt() ?? 1;
                      return slotsOverlap(start, duration, otherStart, otherHours);
                    });
                  }

                  final openHours = dateIso == null
                      ? const <int>[]
                      : slotHours
                          .where(
                            (h) =>
                                durationFits(h, hours) &&
                                !slotStart(dateIso!, h).isBefore(DateTime.now()) &&
                                !taken(dateIso!, h, hours),
                          )
                          .toList();

                  final mine = docs.where((d) => d.data()['clientUid'] == widget.uid).toList()
                    ..sort((a, b) => (a.data()['startsAt'] as String? ?? '').compareTo(b.data()['startsAt'] as String? ?? ''));
                  final inbox = live.toList()
                    ..sort((a, b) => (a.data()['startsAt'] as String? ?? '').compareTo(b.data()['startsAt'] as String? ?? ''));
                  final list = widget.isAdmin ? inbox : mine;

                  return ListView(
                    padding: const EdgeInsets.fromLTRB(24, 8, 24, 40),
                    children: [
                      Text('CONSULTATION', style: kickerStyle),
                      const SizedBox(height: 8),
                      RichText(
                        text: TextSpan(
                          style: displayStyle(36),
                          children: [
                            const TextSpan(text: 'Book an hour, '),
                            TextSpan(
                              text: 'on the calendar.',
                              style: displayStyle(36).copyWith(fontStyle: FontStyle.italic, color: slateMuted),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 10),
                      Text(
                        'Weekdays, Manila time. Morning 9–11, afternoon 1–4. ₱${consultRate.toString()} per hour. After you request a slot, save it to your calendar.',
                        style: bodyStyle,
                      ),
                      if (error != null) ...[
                        const SizedBox(height: 12),
                        Text(error!, style: GoogleFonts.dmSans(fontSize: 13, color: errorRed)),
                      ],
                      const SizedBox(height: 24),
                      Row(
                        children: [
                          Expanded(child: Text('${months[cursor.month - 1]} ${cursor.year}', style: GoogleFonts.cormorantGaramond(fontSize: 24, fontWeight: FontWeight.w600, color: ink))),
                          IconButton(
                            onPressed: () => setState(() {
                              cursor = DateTime(cursor.year, cursor.month - 1, 1);
                            }),
                            icon: const Icon(Icons.chevron_left, color: ink),
                          ),
                          IconButton(
                            onPressed: () => setState(() {
                              cursor = DateTime(cursor.year, cursor.month + 1, 1);
                            }),
                            icon: const Icon(Icons.chevron_right, color: ink),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Row(
                        children: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
                            .map(
                              (d) => Expanded(
                                child: Text(d, textAlign: TextAlign.center, style: kickerStyle.copyWith(fontSize: 10)),
                              ),
                            )
                            .toList(),
                      ),
                      const SizedBox(height: 8),
                      GridView.builder(
                        shrinkWrap: true,
                        physics: const NeverScrollableScrollPhysics(),
                        itemCount: cells.length,
                        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(crossAxisCount: 7),
                        itemBuilder: (context, i) {
                          final day = cells[i];
                          if (day == null) return const SizedBox.shrink();
                          final weekend = !isWeekday(day);
                          final past = day.compareTo(todayIso) < 0;
                          final selected = dateIso == day;
                          final hasSlot = !weekend && !past;
                          return Center(
                            child: GestureDetector(
                              onTap: !hasSlot
                                  ? null
                                  : () => setState(() {
                                        dateIso = day;
                                        hour = null;
                                        error = null;
                                      }),
                              child: Container(
                                width: 36,
                                height: 36,
                                alignment: Alignment.center,
                                decoration: BoxDecoration(
                                  color: selected ? ink : Colors.transparent,
                                  shape: BoxShape.circle,
                                ),
                                child: Text(
                                  '${int.parse(day.substring(8))}',
                                  style: GoogleFonts.dmSans(
                                    fontSize: 13,
                                    fontWeight: FontWeight.w500,
                                    color: selected
                                        ? Colors.white
                                        : hasSlot
                                            ? ink
                                            : const Color(0xFFCBD5E1),
                                  ),
                                ),
                              ),
                            ),
                          );
                        },
                      ),
                      const SizedBox(height: 20),
                      Text('DURATION', style: kickerStyle),
                      const SizedBox(height: 10),
                      Wrap(
                        spacing: 8,
                        children: [1, 2, 3]
                            .map(
                              (n) => GestureDetector(
                                onTap: () => setState(() {
                                  hours = n;
                                  hour = null;
                                }),
                                child: Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
                                  decoration: BoxDecoration(
                                    color: hours == n ? ink : Colors.transparent,
                                    borderRadius: BorderRadius.circular(999),
                                    border: hours == n ? null : Border.all(color: hairline),
                                  ),
                                  child: Text(
                                    '$n hr${n == 1 ? '' : 's'}',
                                    style: GoogleFonts.dmSans(
                                      fontSize: 12,
                                      fontWeight: FontWeight.w600,
                                      color: hours == n ? Colors.white : ink,
                                    ),
                                  ),
                                ),
                              ),
                            )
                            .toList(),
                      ),
                      const SizedBox(height: 20),
                      Text(dateIso == null ? 'PICK A WEEKDAY' : 'TIMES · $dateIso', style: kickerStyle),
                      const SizedBox(height: 10),
                      if (dateIso == null)
                        Text('Select a date above.', style: bodyStyle)
                      else if (openHours.isEmpty)
                        Text('No open times that day for $hours hour${hours == 1 ? '' : 's'}.', style: bodyStyle)
                      else
                        Wrap(
                          spacing: 8,
                          runSpacing: 8,
                          children: openHours
                              .map(
                                (h) => GestureDetector(
                                  onTap: () => setState(() => hour = h),
                                  child: Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
                                    decoration: BoxDecoration(
                                      color: hour == h ? ink : Colors.transparent,
                                      borderRadius: BorderRadius.circular(999),
                                      border: hour == h ? null : Border.all(color: hairline),
                                    ),
                                    child: Text(
                                      formatSlotHour(h),
                                      style: GoogleFonts.dmSans(
                                        fontSize: 12,
                                        fontWeight: FontWeight.w600,
                                        color: hour == h ? Colors.white : ink,
                                      ),
                                    ),
                                  ),
                                ),
                              )
                              .toList(),
                        ),
                      const SizedBox(height: 20),
                      PortalField(label: 'Notes', controller: notes),
                      const SizedBox(height: 20),
                      PortalPillButton(
                        label: sending ? 'Requesting…' : 'Request consultation',
                        enabled: !sending && dateIso != null && hour != null,
                        onPressed: () async {
                          if (dateIso == null || hour == null) return;
                          final messenger = ScaffoldMessenger.of(context);
                          setState(() {
                            sending = true;
                            error = null;
                          });
                          try {
                            if (taken(dateIso!, hour!, hours)) {
                              throw Exception('That slot was just taken. Pick another time.');
                            }
                            final start = slotStart(dateIso!, hour!);
                            await FirebaseFirestore.instance.collection('consultations').add({
                              'clientUid': widget.uid,
                              'clientEmail': widget.email.trim().toLowerCase(),
                              'clientName': widget.displayName.trim().isEmpty ? widget.email : widget.displayName.trim(),
                              if (widget.company.trim().isNotEmpty) 'company': widget.company.trim(),
                              'startsAt': start.toUtc().toIso8601String(),
                              'hours': hours,
                              if (notes.text.trim().isNotEmpty) 'notes': notes.text.trim(),
                              'status': 'requested',
                              'createdAt': DateTime.now().toUtc().toIso8601String(),
                            });
                            if (!mounted) return;
                            await _saveToCalendar(start, hours);
                            if (!mounted) return;
                            setState(() {
                              hour = null;
                              notes.clear();
                            });
                            messenger.showSnackBar(
                              SnackBar(
                                backgroundColor: ink,
                                content: Text('Requested. Add it to your calendar if the sheet did not open.', style: GoogleFonts.dmSans(color: Colors.white)),
                              ),
                            );
                          } catch (e) {
                            if (mounted) setState(() => error = e.toString());
                          } finally {
                            if (mounted) setState(() => sending = false);
                          }
                        },
                      ),
                      const SizedBox(height: 36),
                      Text(widget.isAdmin ? 'UPCOMING' : 'YOUR BOOKINGS', style: kickerStyle),
                      const SizedBox(height: 8),
                      HairlineList(
                        empty: Text(widget.isAdmin ? 'No active consultations.' : 'Nothing booked yet.', style: bodyStyle),
                        children: list.map((doc) {
                          final d = doc.data();
                          final start = DateTime.tryParse(d['startsAt'] as String? ?? '') ?? DateTime.now();
                          final duration = (d['hours'] as num?)?.toInt() ?? 1;
                          final status = d['status'] as String? ?? 'requested';
                          return Padding(
                            padding: const EdgeInsets.symmetric(vertical: 16),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(formatWhen(start), style: GoogleFonts.dmSans(fontSize: 15, fontWeight: FontWeight.w600, color: ink)),
                                const SizedBox(height: 4),
                                Text(
                                  [
                                    '$duration hr${duration == 1 ? '' : 's'}',
                                    status,
                                    if (widget.isAdmin) d['clientName'] as String? ?? '',
                                  ].where((s) => s.toString().isNotEmpty).join(' · '),
                                  style: GoogleFonts.dmSans(fontSize: 12, color: slate),
                                ),
                                if ((d['notes'] as String?)?.isNotEmpty == true)
                                  Padding(
                                    padding: const EdgeInsets.only(top: 6),
                                    child: Text(d['notes'] as String, style: bodyStyle),
                                  ),
                                const SizedBox(height: 12),
                                Wrap(
                                  spacing: 8,
                                  runSpacing: 8,
                                  children: [
                                    if (status != 'cancelled') ...[
                                      _MiniPill(
                                        label: 'Save to calendar',
                                        filled: true,
                                        onTap: () => _saveToCalendar(start, duration),
                                      ),
                                      _MiniPill(
                                        label: 'Google',
                                        onTap: () => launchUrl(googleCalendarUrl(start: start, hours: duration), mode: LaunchMode.externalApplication),
                                      ),
                                    ],
                                    if (widget.isAdmin && status == 'requested')
                                      _MiniPill(
                                        label: 'Confirm',
                                        filled: true,
                                        onTap: () => doc.reference.update({'status': 'confirmed'}),
                                      ),
                                    if (status == 'requested')
                                      _MiniPill(
                                        label: 'Cancel',
                                        onTap: () => doc.reference.update({'status': 'cancelled'}),
                                      ),
                                  ],
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

class _MiniPill extends StatelessWidget {
  const _MiniPill({required this.label, required this.onTap, this.filled = false});
  final String label;
  final VoidCallback onTap;
  final bool filled;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
        decoration: BoxDecoration(
          color: filled ? ink : Colors.transparent,
          borderRadius: BorderRadius.circular(999),
          border: filled ? null : Border.all(color: hairline),
        ),
        child: Text(
          label,
          style: GoogleFonts.dmSans(fontSize: 12, fontWeight: FontWeight.w600, color: filled ? Colors.white : ink),
        ),
      ),
    );
  }
}
