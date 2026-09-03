import 'package:casinworks_portal/main.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('app builds', (tester) async {
    await tester.pumpWidget(const CasinWorksPortalApp());
    expect(find.textContaining('Firebase'), findsWidgets);
  });
}
