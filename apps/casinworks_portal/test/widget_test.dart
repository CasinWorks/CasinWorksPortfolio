import 'package:casinworks_portal/main.dart';
import 'package:casinworks_portal/tutorial.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

/// Opens the guide with animations disabled so the story does not auto-advance.
Future<void> openGuide(WidgetTester tester, {String role = 'client'}) async {
  tester.view.physicalSize = const Size(1290, 2796);
  tester.view.devicePixelRatio = 3;
  addTearDown(tester.view.reset);

  await tester.pumpWidget(
    MediaQuery(
      data: const MediaQueryData(disableAnimations: true),
      child: MaterialApp(
        home: Builder(
          builder: (context) => TextButton(
            onPressed: () => StoryTutorial.open(context, role: role),
            child: const Text('open'),
          ),
        ),
      ),
    ),
  );
  await tester.tap(find.text('open'));
  await tester.pump();
  await tester.pump(const Duration(milliseconds: 50));
}

void main() {
  testWidgets('app builds', (tester) async {
    await tester.pumpWidget(const CasinWorksPortalApp());
    expect(find.text('CASINWORKS'), findsOneWidget);
    expect(find.textContaining('Continue as'), findsOneWidget);
  });

  testWidgets('registering requires agreeing to how details are stored', (tester) async {
    tester.view.physicalSize = const Size(1290, 2796);
    tester.view.devicePixelRatio = 3;
    addTearDown(tester.view.reset);

    await tester.pumpWidget(const CasinWorksPortalApp());

    // Sign-in has no consent gate; the button is live.
    expect(find.textContaining('I agree that CasinWorks stores'), findsNothing);
    expect(tester.widget<FilledButton>(find.byType(FilledButton).first).onPressed, isNotNull);

    await tester.tap(find.text('Register'));
    await tester.pumpAndSettle();

    expect(find.textContaining('I agree that CasinWorks stores'), findsOneWidget);
    expect(find.text('Create account'), findsOneWidget);
    expect(tester.widget<FilledButton>(find.byType(FilledButton).first).onPressed, isNull);

    await tester.tap(find.textContaining('I agree that CasinWorks stores'));
    await tester.pumpAndSettle();

    expect(tester.widget<FilledButton>(find.byType(FilledButton).first).onPressed, isNotNull);
  });

  test('client guide has a course and a booking slide', () {
    final slides = slidesForRole('client');
    expect(slides.length, 6);
    expect(slides.first.kicker, 'CLIENT WORKSPACE');
    expect(slides.any((s) => s.visual == TutorialVisual.course), isTrue);
    expect(slides.any((s) => s.visual == TutorialVisual.book), isTrue);
    expect(slides.last.visual, TutorialVisual.ready);
  });

  testWidgets('skip closes the guide', (tester) async {
    await openGuide(tester);
    expect(find.text('Skip'), findsOneWidget);

    await tester.tap(find.text('Skip'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 50));

    expect(find.text('Skip'), findsNothing);
    expect(find.text('open'), findsOneWidget);
  });

  testWidgets('the last slide closes the guide', (tester) async {
    await openGuide(tester);

    for (var i = 0; i < slidesForRole('client').length - 1; i++) {
      await tester.tap(find.text('Next'));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 50));
    }

    expect(find.text('Enter the workspace'), findsOneWidget);
    await tester.tap(find.text('Enter the workspace'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 50));

    expect(find.text('Enter the workspace'), findsNothing);
    expect(find.text('open'), findsOneWidget);
  });
}
