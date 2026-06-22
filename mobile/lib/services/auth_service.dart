import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/models.dart';

class AuthService extends ChangeNotifier {
  static const _roleKey = 'baraha_mess_role';
  static const _memberKey = 'baraha_mess_member';

  String? _role;
  Member? _member;
  bool _loaded = false;

  String? get role => _role;
  Member? get member => _member;
  bool get isLoggedIn => _role != null;
  bool get isLoaded => _loaded;
  bool get isAdminSession => _role == 'admin';
  bool get isSuperAdmin => _role == 'admin' && _member == null;

  Future<void> load() async {
    final prefs = await SharedPreferences.getInstance();
    _role = prefs.getString(_roleKey);
    final memberJson = prefs.getString(_memberKey);
    if (memberJson != null) {
      _member = Member.fromJson(jsonDecode(memberJson) as Map<String, dynamic>);
    }
    _loaded = true;
    notifyListeners();
  }

  Future<void> login(String role, {Member? member}) async {
    final prefs = await SharedPreferences.getInstance();
    _role = role;
    _member = member;
    await prefs.setString(_roleKey, role);
    if (member != null) {
      await prefs.setString(_memberKey, jsonEncode(member.toJson()));
    } else {
      await prefs.remove(_memberKey);
    }
    notifyListeners();
  }

  Future<void> logout() async {
    final prefs = await SharedPreferences.getInstance();
    _role = null;
    _member = null;
    await prefs.remove(_roleKey);
    await prefs.remove(_memberKey);
    notifyListeners();
  }
}
