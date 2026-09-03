import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import 'theme.dart';
import 'widgets.dart';

class FairwayHole {
  const FairwayHole({
    required this.id,
    required this.title,
    required this.status,
    this.date = '',
    this.description = '',
    this.kind = '',
  });

  final String id;
  final String title;
  final String status;
  final String date;
  final String description;
  final String kind;
}

const _walkCurve = Cubic(0.22, 1, 0.36, 1);
const _fairwaySize = Size(340, 480);

Path fairwayRibbon() {
  return Path()
    ..moveTo(168, 40)
    ..cubicTo(168, 70, 218, 85, 218, 120)
    ..cubicTo(218, 160, 140, 175, 134, 215)
    ..cubicTo(128, 250, 120, 275, 134, 310)
    ..cubicTo(154, 345, 218, 355, 212, 390)
    ..cubicTo(206, 425, 168, 435, 168, 448);
}

const _fallback = <Offset>[
  Offset(174, 64),
  Offset(198, 112),
  Offset(16, 164),
  Offset(16, 220),
  Offset(24, 276),
  Offset(170, 336),
  Offset(190, 388),
  Offset(168, 420),
];

List<Offset> sampleFairway(int count) {
  if (count <= 0) return const [];
  final metrics = fairwayRibbon().computeMetrics().toList();
  if (metrics.isEmpty) return _fallback.take(count).toList();
  final metric = metrics.first;
  if (metric.length <= 0) return _fallback.take(count).toList();
  final start = metric.length * 0.1;
  final end = metric.length * 0.86;
  return List.generate(count, (i) {
    final t = count == 1 ? 0.5 : i / (count - 1);
    final tangent = metric.getTangentForOffset(start + (end - start) * t);
    return tangent?.position ?? _fallback[i.clamp(0, _fallback.length - 1)];
  });
}

int targetIndex(List<FairwayHole> holes) {
  final current = holes.indexWhere((m) => m.status == 'current');
  if (current >= 0) return current;
  if (holes.isNotEmpty && holes.every((m) => m.status == 'done')) return holes.length - 1;
  return 0;
}

String milestoneLabel(String status) {
  switch (status) {
    case 'blocked':
      return 'Blocked on you';
    case 'current':
      return 'Current';
    case 'upcoming':
      return 'Upcoming';
    case 'done':
      return 'Done';
    default:
      return status.isEmpty ? 'Upcoming' : '${status[0].toUpperCase()}${status.substring(1)}';
  }
}

class FairwayVisual extends StatefulWidget {
  const FairwayVisual({super.key, required this.holes, this.onShowInList});
  final List<FairwayHole> holes;
  final ValueChanged<FairwayHole>? onShowInList;

  @override
  State<FairwayVisual> createState() => _FairwayVisualState();
}

class _FairwayVisualState extends State<FairwayVisual> {
  int playhead = 0;
  String? focusedId;
  int _walkGen = 0;

  List<FairwayHole> get holes => widget.holes;

  FairwayHole? get _focused {
    for (final h in holes) {
      if (h.id == focusedId) return h;
    }
    final goal = targetIndex(holes);
    if (goal >= 0 && goal < holes.length) return holes[goal];
    return holes.isEmpty ? null : holes.first;
  }

  FairwayHole? get _initialFocus {
    for (final h in holes) {
      if (h.status == 'current') return h;
    }
    return holes.isEmpty ? null : holes.first;
  }

  @override
  void initState() {
    super.initState();
    focusedId = _initialFocus?.id;
    _walk();
  }

  @override
  void didUpdateWidget(FairwayVisual oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.holes.map((h) => '${h.id}:${h.status}').join() != holes.map((h) => '${h.id}:${h.status}').join()) {
      focusedId = _focused?.id ?? _initialFocus?.id;
      _walk();
    }
  }

  @override
  void dispose() {
    _walkGen++;
    super.dispose();
  }

  void _walk() {
    final goal = targetIndex(holes);
    final token = ++_walkGen;
    setState(() => playhead = 0);
    void tick(int i) {
      if (!mounted || token != _walkGen) return;
      setState(() => playhead = i);
      if (i >= goal) return;
      Future<void>.delayed(const Duration(milliseconds: 380), () => tick(i + 1));
    }

    tick(0);
  }

  @override
  Widget build(BuildContext context) {
    if (holes.isEmpty) {
      return Padding(
        padding: const EdgeInsets.symmetric(vertical: 32),
        child: Text('No course yet.', style: bodyStyle),
      );
    }
    final points = sampleFairway(holes.length);
    final focused = _focused;
    final focusedIndex = focused == null ? -1 : holes.indexWhere((m) => m.id == focused.id);
    final focusedPoint = focusedIndex >= 0 && focusedIndex < points.length ? points[focusedIndex] : null;
    final ballIndex = playhead.clamp(0, points.length - 1);
    final ball = points.isEmpty ? null : points[ballIndex];
    final calloutLeft = focusedPoint == null || focusedPoint.dx < 170;
    final progress = holes.length <= 1 ? 0.08 : (playhead / (holes.length - 1)) * 0.78 + 0.08;

    return Column(
      children: [
        FittedBox(
          child: SizedBox(
            width: _fairwaySize.width,
            height: _fairwaySize.height,
            child: Stack(
              clipBehavior: Clip.none,
              children: [
                CustomPaint(
                  size: _fairwaySize,
                  painter: _FairwayPainter(progress: progress, blocked: holes.any((h) => h.status == 'blocked')),
                ),
                ...holes.asMap().entries.map((entry) {
                  final i = entry.key;
                  final m = entry.value;
                  if (i >= points.length) return const SizedBox.shrink();
                  final slot = points[i];
                  final active = m.id == focusedId;
                  final Color fill;
                  final Color border;
                  final Color text;
                  if (m.status == 'blocked') {
                    fill = blocked;
                    border = blocked;
                    text = Colors.white;
                  } else if (m.status == 'current') {
                    fill = ink;
                    border = ink;
                    text = Colors.white;
                  } else if (m.status == 'upcoming') {
                    fill = Colors.white;
                    border = const Color(0x40000000);
                    text = ink;
                  } else {
                    fill = ink;
                    border = ink;
                    text = Colors.white;
                  }
                  return Positioned(
                    left: slot.dx - 14,
                    top: slot.dy - 14,
                    child: GestureDetector(
                      onTap: () => setState(() => focusedId = m.id),
                      child: AnimatedScale(
                        scale: active ? 1.1 : 1,
                        duration: const Duration(milliseconds: 200),
                        child: Container(
                          width: 28,
                          height: 28,
                          alignment: Alignment.center,
                          decoration: BoxDecoration(
                            color: fill,
                            shape: BoxShape.circle,
                            border: Border.all(color: border),
                            boxShadow: active ? [BoxShadow(color: ink.withValues(alpha: 0.12), blurRadius: 0, spreadRadius: 4)] : null,
                          ),
                          child: Text(
                            '${i + 1}',
                            style: GoogleFonts.dmSans(fontSize: 11, fontWeight: FontWeight.w600, color: text),
                          ),
                        ),
                      ),
                    ),
                  );
                }),
                if (ball != null)
                  AnimatedPositioned(
                    duration: const Duration(milliseconds: 360),
                    curve: _walkCurve,
                    left: ball.dx - 8,
                    top: ball.dy - 8,
                    child: IgnorePointer(
                      child: Container(
                        width: 16,
                        height: 16,
                        decoration: BoxDecoration(
                          color: Colors.white,
                          shape: BoxShape.circle,
                          border: Border.all(color: ink, width: 2),
                          boxShadow: const [BoxShadow(color: Color(0x40000000), blurRadius: 4, offset: Offset(0, 1))],
                        ),
                        child: Center(
                          child: Container(
                            width: 8,
                            height: 8,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              border: Border.all(color: const Color(0x33000000)),
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
                if (focused != null && focusedPoint != null)
                  Positioned(
                    left: (calloutLeft ? focusedPoint.dx + 22 : focusedPoint.dx - 178).clamp(8, 172),
                    top: (focusedPoint.dy - 28).clamp(8, 420),
                    child: ConstrainedBox(
                      constraints: const BoxConstraints(maxWidth: 168),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                        decoration: BoxDecoration(
                          color: focused.status == 'blocked' ? blocked : ink,
                          borderRadius: BorderRadius.circular(8),
                          boxShadow: const [BoxShadow(color: Color(0x14000000), blurRadius: 8, offset: Offset(0, 1))],
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(focused.title, style: GoogleFonts.dmSans(fontSize: 12, fontWeight: FontWeight.w500, color: Colors.white, height: 1.25)),
                            if (focused.date.isNotEmpty)
                              Padding(
                                padding: const EdgeInsets.only(top: 2),
                                child: Text(focused.date, style: GoogleFonts.dmSans(fontSize: 11, color: Colors.white.withValues(alpha: 0.9))),
                              ),
                          ],
                        ),
                      ),
                    ),
                  ),
              ],
            ),
          ),
        ),
        if (focused != null) ...[
          const SizedBox(height: 16),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(color: Colors.white, border: Border.all(color: hairline)),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('HOLE ${focusedIndex + 1}', style: kickerStyle),
                          const SizedBox(height: 6),
                          Text(focused.title, style: GoogleFonts.cormorantGaramond(fontSize: 22, fontWeight: FontWeight.w600, color: ink)),
                          if (focused.description.isNotEmpty)
                            Padding(
                              padding: const EdgeInsets.only(top: 6),
                              child: Text(focused.description, style: bodyStyle.copyWith(fontSize: 13)),
                            ),
                        ],
                      ),
                    ),
                    StatusPill(label: milestoneLabel(focused.status), current: focused.status == 'current'),
                  ],
                ),
                const SizedBox(height: 16),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    OutlinedButton(
                      onPressed: _walk,
                      style: OutlinedButton.styleFrom(
                        foregroundColor: ink,
                        side: const BorderSide(color: fieldBorder),
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                        shape: const StadiumBorder(),
                        textStyle: GoogleFonts.dmSans(fontSize: 12, fontWeight: FontWeight.w600),
                      ),
                      child: const Text('Replay the walk'),
                    ),
                    if (widget.onShowInList != null)
                      FilledButton(
                        onPressed: () => widget.onShowInList!(focused),
                        style: FilledButton.styleFrom(
                          backgroundColor: ink,
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                          shape: const StadiumBorder(),
                          elevation: 0,
                          textStyle: GoogleFonts.dmSans(fontSize: 12, fontWeight: FontWeight.w600),
                        ),
                        child: const Text('Show in the list'),
                      ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ],
    );
  }
}

class _FairwayPainter extends CustomPainter {
  _FairwayPainter({required this.progress, required this.blocked});
  final double progress;
  final bool blocked;

  @override
  void paint(Canvas canvas, Size size) {
    final ribbon = fairwayRibbon();
    final sand = Paint()
      ..color = fairwaySand
      ..style = PaintingStyle.stroke
      ..strokeWidth = 38
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round;
    canvas.drawPath(ribbon, sand);

    final walked = Paint()
      ..color = ink.withValues(alpha: 0.08)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 38
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round;
    for (final metric in ribbon.computeMetrics()) {
      canvas.drawPath(metric.extractPath(0, metric.length * progress.clamp(0, 1)), walked);
    }

    final label = TextPainter(
      text: TextSpan(text: 'Start', style: GoogleFonts.dmSans(fontSize: 11, color: slate)),
      textDirection: TextDirection.ltr,
    )..layout();
    label.paint(canvas, Offset(168 - label.width / 2, 12));

    canvas.drawCircle(const Offset(168, 40), 4.5, Paint()..color = ink);

    if (blocked) {
      canvas.drawCircle(const Offset(124, 274), 5, Paint()..color = const Color(0xFFBA593E));
      canvas.drawCircle(
        const Offset(124, 274),
        5,
        Paint()
          ..color = cream
          ..style = PaintingStyle.stroke
          ..strokeWidth = 2,
      );
    }

    final pole = Paint()
      ..color = ink
      ..strokeWidth = 1.5
      ..strokeCap = StrokeCap.round;
    canvas.drawLine(const Offset(168, 448), const Offset(168, 416), pole);
    final flag = Path()
      ..moveTo(168, 418)
      ..lineTo(182, 426)
      ..lineTo(168, 434)
      ..close();
    canvas.drawPath(flag, Paint()..color = const Color(0xFFBA593E));

    final finish = TextPainter(
      text: TextSpan(text: 'Finish', style: GoogleFonts.dmSans(fontSize: 11, color: slate)),
      textDirection: TextDirection.ltr,
    )..layout();
    finish.paint(canvas, Offset(168 - finish.width / 2, 454));
  }

  @override
  bool shouldRepaint(covariant _FairwayPainter old) => old.progress != progress || old.blocked != blocked;
}
