import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../config/app_config.dart';
import '../models/models.dart';
import '../services/api_client.dart';
import '../services/auth_service.dart';
import '../theme/app_colors.dart';
import '../widgets/app_button.dart';
import 'member_dashboard_screen.dart';
import 'admin_dashboard_screen.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _api = ApiClient();
  final _passwordController = TextEditingController();

  List<Member> _members = [];
  bool _loadingMembers = true;
  bool _loggingIn = false;
  String? _error;
  Member? _passwordMember;
  bool _isSuperAdmin = false;

  @override
  void initState() {
    super.initState();
    _loadMembers();
  }

  @override
  void dispose() {
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _loadMembers() async {
    if (!AppConfig.isConfigured) {
      setState(() {
        _loadingMembers = false;
        _error = 'Set API_BASE_URL when building the app.';
      });
      return;
    }

    try {
      final members = await _api.getMembers();
      if (!mounted) return;
      setState(() {
        _members = members;
        _loadingMembers = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _loadingMembers = false;
        _error = e.toString();
      });
    }
  }

  Future<void> _auditLogin(AuthService auth, {required String userId, required String userName}) async {
    try {
      await _api.createAuditLog({
        'event': 'login',
        'userId': userId,
        'userName': userName,
        'deviceInfo': getDeviceInfo(),
      });
    } catch (_) {}
  }

  Future<void> _loginMember(Member member) async {
    final auth = context.read<AuthService>();
    if (member.isAdmin) {
      setState(() {
        _passwordMember = member;
        _isSuperAdmin = false;
        _passwordController.clear();
      });
      return;
    }

    await auth.login('member', member: member);
    await _auditLogin(auth, userId: member.id, userName: member.name);
    if (!mounted) return;
    _goToDashboard(auth);
  }

  Future<void> _submitPassword() async {
    if (_passwordController.text.isEmpty) return;
    setState(() {
      _loggingIn = true;
      _error = null;
    });

    try {
      final auth = context.read<AuthService>();
      final result = _isSuperAdmin
          ? await _api.login(role: 'super_admin', password: _passwordController.text)
          : await _api.login(role: 'admin', password: _passwordController.text, memberId: _passwordMember!.id);

      await auth.login(result.role, member: result.member);
      final userName = result.member?.name ?? 'Super Admin';
      await _auditLogin(auth, userId: result.member?.id ?? 'super_admin', userName: userName);
      if (!mounted) return;
      _goToDashboard(auth);
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _loggingIn = false;
        _error = e.toString();
      });
    }
  }

  void _goToDashboard(AuthService auth) {
    Navigator.of(context).pushReplacement(
      MaterialPageRoute(
        builder: (_) => auth.isAdminSession ? const AdminDashboardScreen() : const MemberDashboardScreen(),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final showingPassword = _isSuperAdmin || _passwordMember != null;

    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: Stack(
          children: [
            SingleChildScrollView(
              padding: const EdgeInsets.all(24),
              child: Column(
                children: [
                  const SizedBox(height: 32),
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: AppColors.primaryBlue,
                      shape: BoxShape.circle,
                      boxShadow: [BoxShadow(color: AppColors.primaryBlue.withValues(alpha: 0.3), blurRadius: 16, offset: const Offset(0, 8))],
                    ),
                    child: const Icon(Icons.restaurant, color: Colors.white, size: 40),
                  ),
                  const SizedBox(height: 16),
                  Text(
                    'Baraha Bad Boys Mess',
                    textAlign: TextAlign.center,
                    style: Theme.of(context).textTheme.headlineMedium?.copyWith(fontWeight: FontWeight.bold, color: AppColors.foreground),
                  ),
                  const SizedBox(height: 8),
                  const Text('Effortless Mess Management', style: TextStyle(color: AppColors.mutedForeground)),
                  const SizedBox(height: 32),
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(24),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          Text('Select Your Role', textAlign: TextAlign.center, style: Theme.of(context).textTheme.titleLarge),
                          const SizedBox(height: 8),
                          const Text(
                            'Choose your access level to continue.',
                            textAlign: TextAlign.center,
                            style: TextStyle(color: AppColors.mutedForeground),
                          ),
                          const SizedBox(height: 24),
                          if (_error != null) ...[
                            Text(_error!, style: const TextStyle(color: AppColors.red), textAlign: TextAlign.center),
                            const SizedBox(height: 12),
                          ],
                          if (showingPassword) _buildPasswordForm() else _buildRoleSelection(),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const Positioned(
              bottom: 16,
              left: 0,
              right: 0,
              child: Text('Powered by Ibrahim', textAlign: TextAlign.center, style: TextStyle(color: AppColors.mutedForeground, fontSize: 13)),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildPasswordForm() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          children: [
            IconButton(
              onPressed: () => setState(() {
                _passwordMember = null;
                _isSuperAdmin = false;
                _passwordController.clear();
              }),
              icon: const Icon(Icons.arrow_back),
            ),
            Expanded(
              child: Text(
                'Logging in as ${_passwordMember?.name ?? 'Super Admin'}',
                style: const TextStyle(color: AppColors.mutedForeground, fontSize: 14),
              ),
            ),
          ],
        ),
        const SizedBox(height: 8),
        TextField(
          controller: _passwordController,
          obscureText: true,
          decoration: const InputDecoration(
            prefixIcon: Icon(Icons.key),
            hintText: 'Password',
          ),
          onSubmitted: (_) => _submitPassword(),
        ),
        const SizedBox(height: 16),
        AppButton(
          label: _loggingIn ? 'Verifying...' : 'Login',
          isLoading: _loggingIn,
          onPressed: _submitPassword,
          height: 48,
        ),
      ],
    );
  }

  Widget _buildRoleSelection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        AppButton(
          label: 'Super Admin Login',
          icon: Icons.shield,
          variant: AppButtonVariant.superAdmin,
          height: 56,
          onPressed: () => setState(() {
            _isSuperAdmin = true;
            _passwordMember = null;
            _passwordController.clear();
          }),
        ),
        const SizedBox(height: 24),
        const Row(
          children: [
            Expanded(child: Divider()),
            Padding(
              padding: EdgeInsets.symmetric(horizontal: 8),
              child: Text('OR LOGIN AS A MEMBER', style: TextStyle(fontSize: 11, color: AppColors.mutedForeground)),
            ),
            Expanded(child: Divider()),
          ],
        ),
        const SizedBox(height: 24),
        if (_loadingMembers)
          const Center(child: CircularProgressIndicator())
        else
          DropdownButtonFormField<String>(
            decoration: const InputDecoration(hintText: 'Select your name to login'),
            items: _members
                .map(
                  (m) => DropdownMenuItem(
                    value: m.id,
                    child: Row(
                      children: [
                        Icon(m.isAdmin ? Icons.shield : Icons.person, size: 18, color: m.isAdmin ? AppColors.green : null),
                        const SizedBox(width: 8),
                        Text(m.name),
                      ],
                    ),
                  ),
                )
                .toList(),
            onChanged: (id) {
              final member = _members.firstWhere((m) => m.id == id);
              _loginMember(member);
            },
          ),
      ],
    );
  }
}
