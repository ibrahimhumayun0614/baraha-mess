import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../models/models.dart';
import '../services/api_client.dart';
import '../services/auth_service.dart';
import '../theme/app_colors.dart';
import '../widgets/stat_card.dart';
import 'login_screen.dart';

class AdminDashboardScreen extends StatefulWidget {
  const AdminDashboardScreen({super.key});

  @override
  State<AdminDashboardScreen> createState() => _AdminDashboardScreenState();
}

class _AdminDashboardScreenState extends State<AdminDashboardScreen> {
  final _api = ApiClient();
  bool _loading = true;
  String? _error;
  List<Member> _members = [];
  List<Expense> _expenses = [];
  MessStats? _stats;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final results = await Future.wait([
        _api.getMembers(),
        _api.getExpenses(filters: {'period': 'current'}),
        _api.getMessStats(),
      ]);
      if (!mounted) return;
      setState(() {
        _members = results[0] as List<Member>;
        _expenses = results[1] as List<Expense>;
        _stats = results[2] as MessStats;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = e.toString();
      });
    }
  }

  Future<void> _logout() async {
    await context.read<AuthService>().logout();
    if (!mounted) return;
    Navigator.of(context).pushReplacement(MaterialPageRoute(builder: (_) => const LoginScreen()));
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthService>();
    final userName = auth.member?.name ?? 'Super Admin';
    final currency = NumberFormat.simpleCurrency(name: 'AED');
    final dateFormat = DateFormat.yMMMd();

    return Scaffold(
      backgroundColor: AppColors.background,
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _load,
              child: CustomScrollView(
                slivers: [
                  SliverToBoxAdapter(child: DashboardHeader(userName: userName, onLogout: _logout)),
                  if (_error != null)
                    SliverToBoxAdapter(
                      child: Padding(padding: const EdgeInsets.all(16), child: Text(_error!, style: const TextStyle(color: AppColors.red))),
                    ),
                  SliverPadding(
                    padding: const EdgeInsets.all(16),
                    sliver: SliverGrid(
                      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                        crossAxisCount: 2,
                        crossAxisSpacing: 12,
                        mainAxisSpacing: 12,
                        childAspectRatio: 1.3,
                      ),
                      delegate: SliverChildListDelegate([
                        StatCard(title: 'Total Contribution', value: _stats?.totalContribution ?? 0, icon: Icons.attach_money, formatAsCurrency: true),
                        StatCard(title: 'Total Spent', value: _stats?.totalSpent ?? 0, icon: Icons.shopping_cart, formatAsCurrency: true),
                        StatCard(title: 'Balance', value: _stats?.balance ?? 0, icon: Icons.account_balance_wallet, formatAsCurrency: true, isPositive: (_stats?.balance ?? 0) >= 0),
                        StatCard(title: 'Adj. Daily Rate', value: _stats?.adjustedDailyRate ?? 0, icon: Icons.trending_up, formatAsCurrency: true),
                      ]),
                    ),
                  ),
                  SliverToBoxAdapter(
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      child: Card(
                        child: Padding(
                          padding: const EdgeInsets.all(16),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  const Icon(Icons.people, size: 20),
                                  const SizedBox(width: 8),
                                  Text('Members (${_members.length})', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w600)),
                                ],
                              ),
                              const SizedBox(height: 8),
                              ..._members.map(
                                (m) => ListTile(
                                  contentPadding: EdgeInsets.zero,
                                  leading: Icon(m.isAdmin ? Icons.shield : Icons.person, color: m.isAdmin ? AppColors.green : null),
                                  title: Text(m.name),
                                  trailing: Text(currency.format(m.contribution)),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ),
                  SliverToBoxAdapter(
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Card(
                        child: Padding(
                          padding: const EdgeInsets.all(16),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text('Current Expenses', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600)),
                              const SizedBox(height: 8),
                              if (_expenses.isEmpty)
                                const Text('No expenses this period.', style: TextStyle(color: AppColors.mutedForeground))
                              else
                                ..._expenses.take(20).map((e) {
                                  final member = _members.firstWhere((m) => m.id == e.memberId, orElse: () => Member(id: '', name: 'Unknown', type: 'standard', contribution: 0, role: 'member'));
                                  return ListTile(
                                    contentPadding: EdgeInsets.zero,
                                    title: Text(currency.format(e.amount)),
                                    subtitle: Text('${dateFormat.format(DateTime.parse(e.date))} · ${member.name}'),
                                  );
                                }),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ),
                  const SliverToBoxAdapter(child: SizedBox(height: 24)),
                ],
              ),
            ),
    );
  }
}
