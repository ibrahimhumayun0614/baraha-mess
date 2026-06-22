import 'package:flutter_test/flutter_test.dart';
import 'package:baraha_mess/main.dart';

void main() {
  testWidgets('App loads login screen when logged out', (tester) async {
    await tester.pumpWidget(const BarahaMessApp());
    await tester.pumpAndSettle();
    expect(find.text('Baraha Bad Boys Mess'), findsOneWidget);
    expect(find.text('Select Your Role'), findsOneWidget);
  });
}
