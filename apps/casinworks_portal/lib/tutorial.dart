import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'fairway.dart';
import 'theme.dart';
import 'widgets.dart';

const _tutorialVersion = 'portal.tutorial.v2';
const _dwell = Duration(milliseconds: 5600);
const _turn = Duration(milliseconds: 420);
const _ease = Cubic(0.22, 1, 0.36, 1);

class TutorialGate extends StatefulWidget {
  const TutorialGate({super.key, required this.role, required this.child});
  final String role;
  final Widget child;

  @override
  State<TutorialGate> createState() => _TutorialGateState();
}

class _TutorialGateState extends State<TutorialGate> {
  bool _booted = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _boot());
  }

  @override
  void didUpdateWidget(TutorialGate oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.role != widget.role) {
      _booted = false;
      WidgetsBinding.instance.addPostFrameCallback((_) => _boot());
    }
  }

  Future<void> _boot() async {
    if (_booted || !mounted) return;
    _booted = true;
    final prefs = await SharedPreferences.getInstance();
    if (prefs.getBool(_key(widget.role)) == true) return;
    if (!mounted) return;
    await StoryTutorial.open(context, role: widget.role);
    await prefs.setBool(_key(widget.role), true);
  }

  @override
  Widget build(BuildContext context) => widget.child;
}

String _key(String role) => '$_tutorialVersion.$role';

class TutorialSlide {
  const TutorialSlide({
    required this.kicker,
    required this.title,
    required this.italic,
    required this.body,
    required this.visual,
  });

  final String kicker;
  final String title;
  final String italic;
  final String body;
  final TutorialVisual visual;
}

enum TutorialVisual { welcome, projects, course, records, book, gigs, apply, desk, ready }

List<TutorialSlide> slidesForRole(String role) {
  if (role == 'subcontractor') {
    return const [
      TutorialSlide(
        kicker: 'SUBCONTRACTOR REGISTRY',
        title: 'High-stakes work, ',
        italic: 'open postings.',
        body: 'A board of specialized roles for independent engineers. Not a client workspace.',
        visual: TutorialVisual.welcome,
      ),
      TutorialSlide(
        kicker: 'THE BOARD',
        title: 'Read the posting, ',
        italic: 'then apply.',
        body: 'Each row is a live gig — discipline, title, and place. Open postings are the ones still takeable.',
        visual: TutorialVisual.gigs,
      ),
      TutorialSlide(
        kicker: 'APPLY',
        title: 'Send your name. ',
        italic: 'Terms stay off-platform.',
        body: 'Apply registers interest. The engagement itself is written directly with CasinWorks.',
        visual: TutorialVisual.apply,
      ),
      TutorialSlide(
        kicker: 'READY',
        title: 'The board ',
        italic: 'is yours.',
        body: 'Guide sits in the header. Replay this walk whenever you need it.',
        visual: TutorialVisual.ready,
      ),
    ];
  }

  if (role == 'admin') {
    return const [
      TutorialSlide(
        kicker: 'STUDIO DESK',
        title: 'Open a project, ',
        italic: 'work the hole.',
        body: 'Every engagement in one desk. Open a card to reach the current milestone.',
        visual: TutorialVisual.desk,
      ),
      TutorialSlide(
        kicker: 'PROJECTS',
        title: 'Each card is ',
        italic: 'an engagement.',
        body: 'The rule under the name is progress. Open it to walk the course, then issue paper from Documents.',
        visual: TutorialVisual.projects,
      ),
      TutorialSlide(
        kicker: 'THE COURSE',
        title: 'The ball walks ',
        italic: 'to the current hole.',
        body: 'Pins are milestones. Tap one to inspect it, or switch to the list for dates in a row.',
        visual: TutorialVisual.course,
      ),
      TutorialSlide(
        kicker: 'CONSULTATION',
        title: 'The calendar is ',
        italic: 'the inbox.',
        body: 'Requests land on weekday slots in Manila time. Confirm one to hold the hour.',
        visual: TutorialVisual.book,
      ),
      TutorialSlide(
        kicker: 'READY',
        title: 'The desk ',
        italic: 'is yours.',
        body: 'Guide sits in the header. Replay this walk whenever you need it.',
        visual: TutorialVisual.ready,
      ),
    ];
  }

  return const [
    TutorialSlide(
      kicker: 'CLIENT WORKSPACE',
      title: 'Your work, ',
      italic: 'in one place.',
      body: 'Progress, records, and time with the studio — held on one desk.',
      visual: TutorialVisual.welcome,
    ),
    TutorialSlide(
      kicker: 'PROJECTS',
      title: 'The work, ',
      italic: 'in progress.',
      body: 'Each card is a project. The rule shows how far the course has been walked. Tap to open it.',
      visual: TutorialVisual.projects,
    ),
    TutorialSlide(
      kicker: 'THE COURSE',
      title: 'The ball walks ',
      italic: 'to the current hole.',
      body: 'Pins are milestones. Tap one to inspect it, or read “Where things stand” for dates in order.',
      visual: TutorialVisual.course,
    ),
    TutorialSlide(
      kicker: 'RECORDS',
      title: 'Quotations, orders, ',
      italic: 'and invoices.',
      body: 'Documents holds the paper for a project. Tap a row to open the file.',
      visual: TutorialVisual.records,
    ),
    TutorialSlide(
      kicker: 'BOOK',
      title: 'An hour on ',
      italic: 'the calendar.',
      body: 'Weekdays, Manila time. Mornings 9–11, afternoons 1–4. Request a slot, then save it.',
      visual: TutorialVisual.book,
    ),
    TutorialSlide(
      kicker: 'READY',
      title: 'The desk ',
      italic: 'is yours.',
      body: 'Guide sits in the header. Replay this walk whenever you need it.',
      visual: TutorialVisual.ready,
    ),
  ];
}

class StoryTutorial extends StatefulWidget {
  const StoryTutorial({super.key, required this.role, required this.onClose});
  final String role;
  final VoidCallback onClose;

  static Future<void> open(BuildContext context, {required String role}) {
    final reduce = MediaQuery.disableAnimationsOf(context);
    return Navigator.of(context, rootNavigator: true).push<void>(
      PageRouteBuilder(
        opaque: true,
        fullscreenDialog: true,
        transitionDuration: reduce ? Duration.zero : _turn,
        reverseTransitionDuration: reduce ? Duration.zero : const Duration(milliseconds: 260),
        pageBuilder: (ctx, _, _) => StoryTutorial(role: role, onClose: () => Navigator.of(ctx).pop()),
        transitionsBuilder: (ctx, anim, _, child) {
          if (MediaQuery.disableAnimationsOf(ctx)) return child;
          final curved = CurvedAnimation(parent: anim, curve: _ease);
          return FadeTransition(
            opacity: curved,
            child: SlideTransition(
              position: Tween<Offset>(begin: const Offset(0, 0.03), end: Offset.zero).animate(curved),
              child: child,
            ),
          );
        },
      ),
    );
  }

  static Future<void> replay(BuildContext context, {required String role}) => open(context, role: role);

  @override
  State<StoryTutorial> createState() => _StoryTutorialState();
}

class _StoryTutorialState extends State<StoryTutorial> with SingleTickerProviderStateMixin {
  late final List<TutorialSlide> slides;
  late final PageController pager;
  late final AnimationController bar;
  int index = 0;
  double offset = 0;
  bool holding = false;

  bool get reduce => MediaQuery.disableAnimationsOf(context);
  bool get last => index >= slides.length - 1;

  @override
  void initState() {
    super.initState();
    slides = slidesForRole(widget.role);
    pager = PageController()..addListener(_onScroll);
    bar = AnimationController(vsync: this, duration: _dwell)..addStatusListener(_onBar);
    WidgetsBinding.instance.addPostFrameCallback((_) => _restartBar());
  }

  @override
  void dispose() {
    pager.removeListener(_onScroll);
    pager.dispose();
    bar.removeStatusListener(_onBar);
    bar.dispose();
    super.dispose();
  }

  void _onScroll() {
    if (!pager.hasClients) return;
    final page = pager.page ?? 0;
    if ((page - offset).abs() < 0.001) return;
    setState(() => offset = page);
  }

  void _onBar(AnimationStatus status) {
    if (status == AnimationStatus.completed) _next();
  }

  void _restartBar() {
    if (!mounted) return;
    if (reduce || holding) {
      bar.stop();
      return;
    }
    bar.forward(from: 0);
  }

  void _seek(int next) {
    if (next < 0) return;
    if (next >= slides.length) {
      widget.onClose();
      return;
    }
    HapticFeedback.selectionClick();
    if (reduce) {
      pager.jumpToPage(next);
    } else {
      pager.animateToPage(next, duration: _turn, curve: _ease);
    }
  }

  void _next() => _seek(index + 1);
  void _prev() => _seek(index - 1);

  void _tap(TapUpDetails details) {
    if (holding) return;
    final x = details.localPosition.dx;
    if (x < MediaQuery.sizeOf(context).width * 0.26) {
      _prev();
    } else {
      _next();
    }
  }

  @override
  Widget build(BuildContext context) {
    final bottomInset = MediaQuery.viewPaddingOf(context).bottom;

    return Scaffold(
      backgroundColor: cream,
      body: Column(
        children: [
          SafeArea(
            bottom: false,
            child: Column(
              children: [
                Padding(
                  padding: const EdgeInsets.fromLTRB(24, 12, 24, 0),
                  child: Row(
                    children: List.generate(slides.length, (i) {
                      return Expanded(
                        child: Padding(
                          padding: EdgeInsets.only(right: i == slides.length - 1 ? 0 : 5),
                          child: AnimatedBuilder(
                            animation: bar,
                            builder: (context, _) {
                              final fill = i < index
                                  ? 1.0
                                  : i == index
                                  ? (reduce ? 1.0 : bar.value)
                                  : 0.0;
                              return _Rule(fill: fill);
                            },
                          ),
                        ),
                      );
                    }),
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.fromLTRB(24, 16, 12, 0),
                  child: Row(
                    children: [
                      Text('CASINWORKS', style: brandStyle),
                      const SizedBox(width: 10),
                      Container(width: 1, height: 12, color: hairline),
                      const SizedBox(width: 10),
                      Text('GUIDE', style: kickerStyle.copyWith(fontSize: 10, letterSpacing: 1.8)),
                      const Spacer(),
                      TextButton(
                        onPressed: widget.onClose,
                        style: TextButton.styleFrom(minimumSize: const Size(64, 44)),
                        child: Text(
                          'Skip',
                          style: GoogleFonts.dmSans(fontSize: 13, fontWeight: FontWeight.w500, color: slate),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          Expanded(
            child: GestureDetector(
              behavior: HitTestBehavior.deferToChild,
              onTapUp: _tap,
              onLongPressStart: (_) {
                setState(() => holding = true);
                bar.stop();
              },
              onLongPressEnd: (_) {
                setState(() => holding = false);
                if (!reduce) bar.forward();
              },
              child: Stack(
                children: [
                  PageView.builder(
                    controller: pager,
                    itemCount: slides.length,
                    onPageChanged: (i) {
                      setState(() => index = i);
                      _restartBar();
                    },
                    itemBuilder: (context, i) => _SlidePage(slide: slides[i], delta: offset - i),
                  ),
                  Positioned(
                    left: 0,
                    right: 0,
                    bottom: 0,
                    height: 132 + bottomInset,
                    child: IgnorePointer(
                      child: DecoratedBox(
                        decoration: const BoxDecoration(
                          gradient: LinearGradient(
                            begin: Alignment.topCenter,
                            end: Alignment.bottomCenter,
                            colors: [Color(0x00ECEBE7), cream, cream],
                            stops: [0, 0.55, 1],
                          ),
                        ),
                      ),
                    ),
                  ),
                  Positioned(
                    left: 24,
                    right: 24,
                    bottom: 16 + bottomInset,
                    child: _Footer(
                      index: index,
                      total: slides.length,
                      last: last,
                      holding: holding,
                      onNext: _next,
                      onDone: widget.onClose,
                      doneLabel: widget.role == 'subcontractor' ? 'Enter the board' : 'Enter the workspace',
                    ),
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

class _Rule extends StatelessWidget {
  const _Rule({required this.fill});
  final double fill;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 2,
      child: Stack(
        children: [
          Positioned.fill(child: ColoredBox(color: ink.withValues(alpha: 0.12))),
          FractionallySizedBox(
            alignment: Alignment.centerLeft,
            widthFactor: fill.clamp(0.0, 1.0),
            child: const ColoredBox(color: ink),
          ),
        ],
      ),
    );
  }
}

class _Footer extends StatelessWidget {
  const _Footer({
    required this.index,
    required this.total,
    required this.last,
    required this.holding,
    required this.onNext,
    required this.onDone,
    required this.doneLabel,
  });

  final int index;
  final int total;
  final bool last;
  final bool holding;
  final VoidCallback onNext;
  final VoidCallback onDone;
  final String doneLabel;

  @override
  Widget build(BuildContext context) {
    if (last) return PortalPillButton(label: doneLabel, onPressed: onDone);

    String two(int n) => n.toString().padLeft(2, '0');
    return Row(
      children: [
        Text(
          '${two(index + 1)} / ${two(total)}',
          style: GoogleFonts.dmSans(fontSize: 12, fontWeight: FontWeight.w600, color: ink, letterSpacing: 1.2),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Text(holding ? 'Paused' : 'Hold to pause', style: GoogleFonts.dmSans(fontSize: 12, color: slate)),
        ),
        GestureDetector(
          onTap: onNext,
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
            decoration: const BoxDecoration(color: ink, borderRadius: BorderRadius.all(Radius.circular(999))),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  'Next',
                  style: GoogleFonts.dmSans(fontSize: 13, fontWeight: FontWeight.w600, color: Colors.white),
                ),
                const SizedBox(width: 6),
                const Icon(Icons.arrow_forward, size: 14, color: Colors.white),
              ],
            ),
          ),
        ),
      ],
    );
  }
}

class _SlidePage extends StatelessWidget {
  const _SlidePage({required this.slide, required this.delta});
  final TutorialSlide slide;
  final double delta;

  @override
  Widget build(BuildContext context) {
    final away = delta.abs().clamp(0.0, 1.0);
    final fade = 1 - Curves.easeOut.transform(away);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Opacity(
          opacity: fade,
          child: Transform.translate(
            offset: Offset(delta * 56, 0),
            child: Padding(
              padding: const EdgeInsets.fromLTRB(24, 22, 24, 0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(slide.kicker, style: kickerStyle),
                  const SizedBox(height: 10),
                  RichText(
                    text: TextSpan(
                      style: displayStyle(36),
                      children: [
                        TextSpan(text: slide.title),
                        TextSpan(
                          text: slide.italic,
                          style: displayStyle(36).copyWith(fontStyle: FontStyle.italic, color: slateMuted),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 12),
                  Text(slide.body, style: bodyStyle.copyWith(fontSize: 14, height: 1.5)),
                ],
              ),
            ),
          ),
        ),
        const SizedBox(height: 22),
        Expanded(
          child: Opacity(
            opacity: fade,
            child: Transform.translate(
              offset: Offset(delta * -34, 0),
              child: Transform.scale(
                scale: 1 - 0.03 * away,
                alignment: Alignment.topCenter,
                child: _VisualPanel(
                  kind: slide.visual,
                  // Keep panels that fill clear of the footer controls.
                  bottomReserve: 84 + MediaQuery.viewPaddingOf(context).bottom,
                ),
              ),
            ),
          ),
        ),
      ],
    );
  }
}

class _VisualPanel extends StatelessWidget {
  const _VisualPanel({required this.kind, required this.bottomReserve});
  final TutorialVisual kind;
  final double bottomReserve;

  @override
  Widget build(BuildContext context) {
    // A short mock hugs its content; a tall one runs off the bottom edge and is
    // clipped under the footer fade. Either way there is no empty white box.
    final body = _fills ? _mock : SingleChildScrollView(physics: const NeverScrollableScrollPhysics(), child: _mock);

    return Padding(
      padding: EdgeInsets.only(left: 24, right: 24, bottom: _fills ? bottomReserve : 0),
      child: Align(
        alignment: Alignment.topCenter,
        child: DecoratedBox(
          decoration: BoxDecoration(
            color: Colors.white,
            border: Border.all(color: hairline),
          ),
          child: ClipRect(
            child: Padding(padding: const EdgeInsets.all(18), child: body),
          ),
        ),
      ),
    );
  }

  /// These lay themselves out against the panel height; the rest size to content.
  bool get _fills => kind == TutorialVisual.course || kind == TutorialVisual.book || kind == TutorialVisual.ready;

  Widget get _mock => switch (kind) {
    TutorialVisual.welcome => const _DeskMock(),
    TutorialVisual.desk => const _DeskMock(admin: true),
    TutorialVisual.projects => const _ProjectsMock(),
    TutorialVisual.course => const _CourseMock(),
    TutorialVisual.records => const _RecordsMock(),
    TutorialVisual.book => const _BookMock(),
    TutorialVisual.gigs => const _GigsMock(),
    TutorialVisual.apply => const _ApplyMock(),
    TutorialVisual.ready => const _ReadyMock(),
  };
}

class _MockHeader extends StatelessWidget {
  const _MockHeader({this.trailing = 'Guide · Book', this.markGuide = false});
  final String trailing;
  final bool markGuide;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'CasinWorks',
                    style: GoogleFonts.dmSans(fontSize: 14, fontWeight: FontWeight.w600, color: ink),
                  ),
                  const SizedBox(height: 2),
                  Text('CLIENT PORTAL', style: kickerStyle.copyWith(fontSize: 8, letterSpacing: 1.6)),
                ],
              ),
            ),
            if (markGuide) ...[
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
                decoration: const BoxDecoration(color: ink, borderRadius: BorderRadius.all(Radius.circular(999))),
                child: Text(
                  'Guide',
                  style: GoogleFonts.dmSans(fontSize: 11, fontWeight: FontWeight.w600, color: Colors.white),
                ),
              ),
              const SizedBox(width: 10),
              Text(
                'Book',
                style: GoogleFonts.dmSans(fontSize: 11, fontWeight: FontWeight.w500, color: slate),
              ),
            ] else
              Text(
                trailing,
                style: GoogleFonts.dmSans(fontSize: 11, fontWeight: FontWeight.w500, color: slate),
              ),
          ],
        ),
        const SizedBox(height: 14),
        const Divider(height: 1, color: hairline),
      ],
    );
  }
}

class _ProjectRow extends StatelessWidget {
  const _ProjectRow({required this.name, required this.meta, required this.progress, this.dim = false});
  final String name;
  final String meta;
  final double progress;
  final bool dim;

  @override
  Widget build(BuildContext context) {
    return Opacity(
      opacity: dim ? 0.45 : 1,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(meta, style: kickerStyle.copyWith(fontSize: 9, letterSpacing: 1.4)),
          const SizedBox(height: 6),
          Text(
            name,
            style: GoogleFonts.cormorantGaramond(fontSize: 21, fontWeight: FontWeight.w600, color: ink),
          ),
          const SizedBox(height: 12),
          ClipRect(
            child: LinearProgressIndicator(value: progress, minHeight: 5, color: ink, backgroundColor: hairline),
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              Expanded(
                child: Text(
                  '${(progress * 100).round()}% complete',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: GoogleFonts.dmSans(fontSize: 11, color: slate),
                ),
              ),
              Text(
                'Open →',
                style: GoogleFonts.dmSans(fontSize: 11, fontWeight: FontWeight.w600, color: ink),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _DeskMock extends StatelessWidget {
  const _DeskMock({this.admin = false});
  final bool admin;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _MockHeader(trailing: admin ? 'Clients · Admin' : 'Guide · Book'),
        const SizedBox(height: 18),
        Text(admin ? 'STUDIO DESK' : 'CLIENT WORKSPACE', style: kickerStyle.copyWith(fontSize: 9)),
        const SizedBox(height: 8),
        RichText(
          text: TextSpan(
            style: displayStyle(26),
            children: [
              TextSpan(text: admin ? 'Open a project, ' : 'The work, '),
              TextSpan(
                text: admin ? 'work the hole.' : 'in progress.',
                style: displayStyle(26).copyWith(fontStyle: FontStyle.italic, color: slateMuted),
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),
        Align(
          alignment: Alignment.centerLeft,
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 9),
            decoration: const BoxDecoration(color: ink, borderRadius: BorderRadius.all(Radius.circular(999))),
            child: Text(
              admin ? 'Consultation calendar' : 'Book a consultation',
              style: GoogleFonts.dmSans(fontSize: 11, fontWeight: FontWeight.w600, color: Colors.white),
            ),
          ),
        ),
        const SizedBox(height: 20),
        const Divider(height: 1, color: hairline),
        const SizedBox(height: 16),
        const _ProjectRow(name: 'Harbour operations suite', meta: 'ACTIVE', progress: 0.62),
        const SizedBox(height: 20),
        const Divider(height: 1, color: hairline),
        const SizedBox(height: 16),
        const _ProjectRow(name: 'Terminal telemetry', meta: 'ACTIVE', progress: 0.24, dim: true),
      ],
    );
  }
}

class _ProjectsMock extends StatelessWidget {
  const _ProjectsMock();

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('PROJECTS', style: kickerStyle.copyWith(fontSize: 9)),
        const SizedBox(height: 16),
        const Divider(height: 1, color: hairline),
        const SizedBox(height: 18),
        const _ProjectRow(name: 'Harbour operations suite', meta: 'NORTHWIND · ACTIVE', progress: 0.62),
        const SizedBox(height: 20),
        const Divider(height: 1, color: hairline),
        const SizedBox(height: 18),
        const _ProjectRow(name: 'Terminal telemetry', meta: 'NORTHWIND · ACTIVE', progress: 0.24),
        const SizedBox(height: 20),
        const Divider(height: 1, color: hairline),
        const SizedBox(height: 18),
        const _ProjectRow(name: 'Berth scheduling', meta: 'ARCHIVED', progress: 1, dim: true),
      ],
    );
  }
}

class _CourseMock extends StatelessWidget {
  const _CourseMock();

  @override
  Widget build(BuildContext context) {
    const statuses = ['done', 'done', 'current', 'upcoming', 'upcoming'];
    final pins = sampleFairway(statuses.length);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Flexible(
              child: Text(
                'THE COURSE',
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: kickerStyle.copyWith(fontSize: 9),
              ),
            ),
            const SizedBox(width: 12),
            Flexible(
              child: FittedBox(
                fit: BoxFit.scaleDown,
                alignment: Alignment.centerRight,
                child: Container(
                  padding: const EdgeInsets.all(3),
                  decoration: BoxDecoration(
                    color: panel,
                    border: Border.all(color: hairline),
                    borderRadius: BorderRadius.circular(999),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: const BoxDecoration(
                          color: ink,
                          borderRadius: BorderRadius.all(Radius.circular(999)),
                        ),
                        child: Text(
                          'The course',
                          style: GoogleFonts.dmSans(fontSize: 10, fontWeight: FontWeight.w500, color: Colors.white),
                        ),
                      ),
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 10),
                        child: Text(
                          'Where things stand',
                          style: GoogleFonts.dmSans(fontSize: 10, fontWeight: FontWeight.w500, color: slate),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        Expanded(
          child: FittedBox(
            alignment: Alignment.topCenter,
            child: SizedBox(
              width: 340,
              height: 480,
              child: Stack(
                clipBehavior: Clip.none,
                children: [
                  CustomPaint(size: const Size(340, 480), painter: _RibbonPainter()),
                  ...statuses.indexed.map((entry) {
                    final (i, status) = entry;
                    if (i >= pins.length) return const SizedBox.shrink();
                    final slot = pins[i];
                    final filled = status != 'upcoming';
                    final current = status == 'current';
                    return Positioned(
                      left: slot.dx - 14,
                      top: slot.dy - 14,
                      child: Container(
                        width: 28,
                        height: 28,
                        alignment: Alignment.center,
                        decoration: BoxDecoration(
                          color: filled ? ink : Colors.white,
                          shape: BoxShape.circle,
                          border: Border.all(color: filled ? ink : const Color(0x40000000)),
                          boxShadow: current
                              ? [BoxShadow(color: ink.withValues(alpha: 0.12), blurRadius: 0, spreadRadius: 4)]
                              : null,
                        ),
                        child: Text(
                          '${i + 1}',
                          style: GoogleFonts.dmSans(
                            fontSize: 11,
                            fontWeight: FontWeight.w600,
                            color: filled ? Colors.white : ink,
                          ),
                        ),
                      ),
                    );
                  }),
                  if (pins.length > 2)
                    Positioned(
                      left: (pins[2].dx + 24).clamp(8.0, 168.0),
                      top: pins[2].dy - 26,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                        decoration: BoxDecoration(color: ink, borderRadius: BorderRadius.circular(8)),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(
                              'Design review',
                              style: GoogleFonts.dmSans(fontSize: 12, fontWeight: FontWeight.w500, color: Colors.white),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              '12 Sep',
                              style: GoogleFonts.dmSans(fontSize: 11, color: Colors.white.withValues(alpha: 0.9)),
                            ),
                          ],
                        ),
                      ),
                    ),
                ],
              ),
            ),
          ),
        ),
      ],
    );
  }
}

class _RibbonPainter extends CustomPainter {
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
      canvas.drawPath(metric.extractPath(0, metric.length * 0.58), walked);
    }

    final start = TextPainter(
      text: TextSpan(
        text: 'Start',
        style: GoogleFonts.dmSans(fontSize: 11, color: slate),
      ),
      textDirection: TextDirection.ltr,
    )..layout();
    start.paint(canvas, Offset(168 - start.width / 2, 12));
    canvas.drawCircle(const Offset(168, 40), 4.5, Paint()..color = ink);

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
    canvas.drawPath(flag, Paint()..color = blocked);

    final finish = TextPainter(
      text: TextSpan(
        text: 'Finish',
        style: GoogleFonts.dmSans(fontSize: 11, color: slate),
      ),
      textDirection: TextDirection.ltr,
    )..layout();
    finish.paint(canvas, Offset(168 - finish.width / 2, 454));
  }

  @override
  bool shouldRepaint(covariant _RibbonPainter oldDelegate) => false;
}

class _RecordsMock extends StatelessWidget {
  const _RecordsMock();

  @override
  Widget build(BuildContext context) {
    const rows = [
      ('Quotation — Q-014', 'Quotation · 12 Aug · ₱—', 'issued'),
      ('Purchase order', 'PO-88 · 28 Aug', 'received'),
      ('Invoice — INV-031', 'Invoice · 02 Sep', 'sent'),
      ('Remittance advice', 'Remittance · 04 Sep', 'confirmed'),
    ];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('RECORDS', style: kickerStyle.copyWith(fontSize: 9)),
        const SizedBox(height: 8),
        Text('Documents.', style: displayStyle(24)),
        const SizedBox(height: 16),
        const Divider(height: 1, color: hairline),
        ...rows.map(
          (row) => Column(
            children: [
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 15),
                child: Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            row.$1,
                            style: GoogleFonts.dmSans(fontSize: 14, fontWeight: FontWeight.w600, color: ink),
                          ),
                          const SizedBox(height: 3),
                          Text(row.$2, style: GoogleFonts.dmSans(fontSize: 11, color: slate)),
                        ],
                      ),
                    ),
                    StatusPill(label: row.$3),
                  ],
                ),
              ),
              const Divider(height: 1, color: hairline),
            ],
          ),
        ),
      ],
    );
  }
}

class _BookMock extends StatelessWidget {
  const _BookMock();

  @override
  Widget build(BuildContext context) {
    const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Expanded(
              child: Text(
                'September 2026',
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: GoogleFonts.cormorantGaramond(fontSize: 22, fontWeight: FontWeight.w600, color: ink),
              ),
            ),
            const Icon(Icons.chevron_left, size: 18, color: ink),
            const SizedBox(width: 10),
            const Icon(Icons.chevron_right, size: 18, color: ink),
          ],
        ),
        const SizedBox(height: 12),
        Row(
          children: weekdays
              .map(
                (d) => Expanded(
                  child: Text(
                    d,
                    textAlign: TextAlign.center,
                    style: kickerStyle.copyWith(fontSize: 8, letterSpacing: 1),
                  ),
                ),
              )
              .toList(),
        ),
        const SizedBox(height: 8),
        for (var week = 0; week < 4; week++)
          Padding(
            padding: const EdgeInsets.only(bottom: 4),
            child: Row(
              children: List.generate(7, (col) {
                final day = week * 7 + col - 1;
                final weekend = col >= 5;
                final selected = day == 10;
                if (day < 1 || day > 30) return const Expanded(child: SizedBox(height: 32));
                return Expanded(
                  child: Center(
                    child: Container(
                      width: 30,
                      height: 30,
                      alignment: Alignment.center,
                      decoration: BoxDecoration(color: selected ? ink : Colors.transparent, shape: BoxShape.circle),
                      child: Text(
                        '$day',
                        style: GoogleFonts.dmSans(
                          fontSize: 12,
                          fontWeight: FontWeight.w500,
                          color: selected
                              ? Colors.white
                              : weekend
                              ? const Color(0xFFCBD5E1)
                              : ink,
                        ),
                      ),
                    ),
                  ),
                );
              }),
            ),
          ),
        const SizedBox(height: 14),
        Text('DURATION', style: kickerStyle.copyWith(fontSize: 9)),
        const SizedBox(height: 8),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [_chip('1 hr', on: true), _chip('2 hrs', on: false), _chip('3 hrs', on: false)],
        ),
        const SizedBox(height: 16),
        Text('TIMES · THU 10 SEP', style: kickerStyle.copyWith(fontSize: 9)),
        const SizedBox(height: 8),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [_chip('9:00 AM', on: false), _chip('10:00 AM', on: true), _chip('1:00 PM', on: false)],
        ),
        const Spacer(),
        Container(
          width: double.infinity,
          alignment: Alignment.center,
          padding: const EdgeInsets.symmetric(vertical: 13),
          decoration: const BoxDecoration(color: ink, borderRadius: BorderRadius.all(Radius.circular(999))),
          child: Text(
            'Request consultation',
            style: GoogleFonts.dmSans(fontSize: 13, fontWeight: FontWeight.w600, color: Colors.white),
          ),
        ),
      ],
    );
  }

  Widget _chip(String label, {required bool on}) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 13, vertical: 7),
      decoration: BoxDecoration(
        color: on ? ink : Colors.transparent,
        borderRadius: BorderRadius.circular(999),
        border: on ? null : Border.all(color: hairline),
      ),
      child: Text(
        label,
        style: GoogleFonts.dmSans(fontSize: 11, fontWeight: FontWeight.w600, color: on ? Colors.white : ink),
      ),
    );
  }
}

class _GigsMock extends StatelessWidget {
  const _GigsMock();

  @override
  Widget build(BuildContext context) {
    const rows = [
      ('FIRMWARE', 'Field radio bring-up', 'Manila · contract'),
      ('BACKEND', 'Ledger reconciliation service', 'Remote · 3 months'),
      ('MOBILE', 'Fleet inspection app', 'Cebu · on site'),
    ];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('OPEN POSTINGS', style: kickerStyle.copyWith(fontSize: 9)),
        const SizedBox(height: 14),
        const Divider(height: 1, color: hairline),
        ...rows.map(
          (row) => Column(
            children: [
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(row.$1, style: kickerStyle.copyWith(fontSize: 9, letterSpacing: 1.4)),
                    const SizedBox(height: 6),
                    Text(
                      row.$2,
                      style: GoogleFonts.cormorantGaramond(fontSize: 20, fontWeight: FontWeight.w600, color: ink),
                    ),
                    const SizedBox(height: 5),
                    Text(row.$3, style: GoogleFonts.dmSans(fontSize: 11, color: slate)),
                  ],
                ),
              ),
              const Divider(height: 1, color: hairline),
            ],
          ),
        ),
      ],
    );
  }
}

class _ApplyMock extends StatelessWidget {
  const _ApplyMock();

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('FIRMWARE', style: kickerStyle.copyWith(fontSize: 9, letterSpacing: 1.4)),
        const SizedBox(height: 6),
        Text(
          'Field radio bring-up',
          style: GoogleFonts.cormorantGaramond(fontSize: 24, fontWeight: FontWeight.w600, color: ink),
        ),
        const SizedBox(height: 5),
        Text('Manila · contract', style: GoogleFonts.dmSans(fontSize: 12, color: slate)),
        const SizedBox(height: 18),
        Align(
          alignment: Alignment.centerLeft,
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
            decoration: const BoxDecoration(color: ink, borderRadius: BorderRadius.all(Radius.circular(999))),
            child: Text(
              'Apply',
              style: GoogleFonts.dmSans(fontSize: 12, fontWeight: FontWeight.w600, color: Colors.white),
            ),
          ),
        ),
        const SizedBox(height: 22),
        Container(
          width: double.infinity,
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
          color: ink,
          child: Text(
            'Application sent',
            style: GoogleFonts.dmSans(fontSize: 13, fontWeight: FontWeight.w500, color: Colors.white),
          ),
        ),
        const SizedBox(height: 18),
        Text(
          'Your application is a note of interest. The engagement itself is written outside this board.',
          style: bodyStyle.copyWith(fontSize: 13),
        ),
      ],
    );
  }
}

class _ReadyMock extends StatelessWidget {
  const _ReadyMock();

  @override
  Widget build(BuildContext context) {
    const hints = [
      ('Guide', 'Replay this walk from the header.'),
      ('Hold', 'Pause a story with a long press.'),
      ('Swipe', 'Left or right to move between stories.'),
      ('Skip', 'Leave the walk at any point.'),
    ];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const _MockHeader(markGuide: true),
        const SizedBox(height: 18),
        Text('WE MAKE THINGS WORK.', style: kickerStyle.copyWith(fontSize: 9)),
        Expanded(
          // Spread the hints when there is room, clip them when there is not.
          child: LayoutBuilder(
            builder: (context, box) => SingleChildScrollView(
              physics: const NeverScrollableScrollPhysics(),
              child: ConstrainedBox(
                constraints: BoxConstraints(minHeight: box.maxHeight),
                child: IntrinsicHeight(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: hints.indexed.map((entry) {
                      final (i, hint) = entry;
                      return Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          SizedBox(
                            width: 30,
                            child: Text(
                              '0${i + 1}',
                              style: GoogleFonts.cormorantGaramond(
                                fontSize: 18,
                                fontWeight: FontWeight.w600,
                                color: slateMuted,
                              ),
                            ),
                          ),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  hint.$1,
                                  style: GoogleFonts.dmSans(fontSize: 13, fontWeight: FontWeight.w600, color: ink),
                                ),
                                const SizedBox(height: 3),
                                Text(hint.$2, style: GoogleFonts.dmSans(fontSize: 12, color: slate)),
                              ],
                            ),
                          ),
                        ],
                      );
                    }).toList(),
                  ),
                ),
              ),
            ),
          ),
        ),
        const Divider(height: 1, color: hairline),
        const SizedBox(height: 14),
        Text('CASINWORKS · INDEPENDENT ENGINEERING', style: kickerStyle.copyWith(fontSize: 8, letterSpacing: 1.6)),
      ],
    );
  }
}
