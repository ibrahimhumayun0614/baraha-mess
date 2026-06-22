import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'services/auth_service.dart';
import 'screens/login_screen.dart';
import 'screens/member_dashboard_screen.dart';
import 'screens/admin_dashboard_screen.dart';
import 'theme/app_theme.dart';

void main() {
  runApp(const BarahaMessApp());
}

class BarahaMessApp extends StatelessWidget {
  const BarahaMessApp({super.key});

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (_) => AuthService()..load(),
      child: MaterialApp(
        title: 'Baraha Bad Boys Mess',
        debugShowCheckedModeBanner: false,
        theme: AppTheme.light(),
        home: const _RootScreen(),
      ),
    );
  }
}

class _RootScreen extends StatelessWidget {
  const _RootScreen();

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthService>();

    if (!auth.isLoaded) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }

    if (!auth.isLoggedIn) {
      return const LoginScreen();
    }

    if (auth.isAdminSession) {
      return const AdminDashboardScreen();
    }

    return const MemberDashboardScreen();
  }
}
