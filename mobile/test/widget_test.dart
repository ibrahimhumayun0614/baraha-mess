import 'package:flutter_test/flutter_test.dart';
import 'package:baraha_mess/config/app_config.dart';

void main() {
  test('production API URL is configured', () {
    expect(AppConfig.isConfigured, isTrue);
    expect(AppConfig.baseUrl, contains('barahamess-2025.ibrahimhumayun0614.workers.dev'));
  });
}
