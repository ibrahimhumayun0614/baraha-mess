class AppConfig {
  static const productionUrl = 'https://barahamess-2025.ibrahimhumayun0614.workers.dev';

  static const apiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: productionUrl,
  );

  static String get baseUrl {
    if (apiBaseUrl.isNotEmpty) return apiBaseUrl.replaceAll(RegExp(r'/+$'), '');
    return '';
  }

  static bool get isConfigured => baseUrl.isNotEmpty;
}
