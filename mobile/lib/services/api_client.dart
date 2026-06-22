import 'dart:convert';
import 'package:http/http.dart' as http;
import '../config/app_config.dart';
import '../models/models.dart';

class ApiException implements Exception {
  final String message;
  ApiException(this.message);

  @override
  String toString() => message;
}

class ApiClient {
  ApiClient({http.Client? client}) : _client = client ?? http.Client();

  final http.Client _client;

  Uri _uri(String path, [Map<String, String>? query]) {
    if (!AppConfig.isConfigured) {
      throw ApiException('API_BASE_URL is not set.');
    }
    final normalized = path.startsWith('/') ? path : '/$path';
    return Uri.parse('${AppConfig.baseUrl}$normalized').replace(queryParameters: query);
  }

  Future<T> get<T>(String path, T Function(dynamic) fromJson, {Map<String, String>? query}) async {
    final res = await _client.get(_uri(path, query), headers: _headers());
    return _parse(res, fromJson);
  }

  Future<T> post<T>(String path, T Function(dynamic) fromJson, {Object? body}) async {
    final res = await _client.post(_uri(path), headers: _headers(), body: body != null ? jsonEncode(body) : null);
    return _parse(res, fromJson);
  }

  Future<T> put<T>(String path, T Function(dynamic) fromJson, {Object? body}) async {
    final res = await _client.put(_uri(path), headers: _headers(), body: body != null ? jsonEncode(body) : null);
    return _parse(res, fromJson);
  }

  Future<T> delete<T>(String path, T Function(dynamic) fromJson, {Map<String, String>? query}) async {
    final res = await _client.delete(_uri(path, query), headers: _headers());
    return _parse(res, fromJson);
  }

  Map<String, String> _headers() => const {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      };

  T _parse<T>(http.Response res, T Function(dynamic) fromJson) {
    final dynamic json;
    try {
      json = jsonDecode(res.body);
    } catch (_) {
      throw ApiException('Invalid response from server (${res.statusCode})');
    }

    if (json is! Map<String, dynamic>) {
      throw ApiException('Unexpected response format');
    }

    final parsed = ApiResponse<T>.fromJson(json, fromJson);
    if (!res.statusCode.toString().startsWith('2') || !parsed.success || parsed.data == null) {
      throw ApiException(parsed.error ?? 'Request failed (${res.statusCode})');
    }
    return parsed.data as T;
  }

  Future<List<Member>> getMembers() => get('/api/members', (d) => (d as List).map((e) => Member.fromJson(e as Map<String, dynamic>)).toList());

  Future<MessStats> getMessStats() => get('/api/mess/stats', (d) => MessStats.fromJson(d as Map<String, dynamic>));

  Future<List<Expense>> getExpenses({Map<String, String>? filters}) {
    return get('/api/expenses', (d) => (d as List).map((e) => Expense.fromJson(e as Map<String, dynamic>)).toList(), query: filters);
  }

  Future<LoginResult> login({required String role, String? password, String? memberId}) {
    return post('/api/auth/login', (d) => LoginResult.fromJson(d as Map<String, dynamic>), body: {
      'role': role,
      if (password != null) 'password': password,
      if (memberId != null) 'memberId': memberId,
    });
  }

  Future<void> createAuditLog(Map<String, dynamic> log) {
    return post('/api/audit-logs', (_) => null, body: log);
  }

  Future<Expense> createExpense(Map<String, dynamic> payload) {
    return post('/api/expenses', (d) => Expense.fromJson(d as Map<String, dynamic>), body: payload);
  }
}

String getDeviceInfo() => 'Baraha Mess Flutter on Android';
