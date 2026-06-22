import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../models/models.dart';
import '../services/api_client.dart';
import '../services/auth_service.dart';
import '../theme/app_colors.dart';
import '../widgets/app_button.dart';
import '../widgets/stat_card.dart';
import 'login_screen.dart';

class MemberDashboardScreen extends StatefulWidget {
  const MemberDashboardScreen({super.key});

  @override
  State<MemberDashboardScreen> createState() => _MemberDashboardScreenState();
}

class _MemberDashboardScreenState extends State<MemberDashboardScreen> {
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
      final auth = context.read<AuthService>();
      final memberId = auth.member!.id;
      final results = await Future.wait([
        _api.getMembers(),
        _api.getExpenses(filters: {'memberId': memberId}),
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

  Future<void> _showAddExpense() async {
    final auth = context.read<AuthService>();
    final user = auth.member!;
    final amountController = TextEditingController();
    final noteController = TextEditingController();
    var selectedMemberId = user.id;

    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      builder: (ctx) {
        return Padding(
          padding: EdgeInsets.only(left: 24, right: 24, top: 24, bottom: MediaQuery.of(ctx).viewInsets.bottom + 24),
          child: StatefulBuilder(
            builder: (context, setModalState) {
              return Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Text('Log a New Expense', style: Theme.of(context).textTheme.titleLarge),
                  const SizedBox(height: 16),
                  DropdownButtonFormField<String>(
                    initialValue: selectedMemberId,
                    decoration: const InputDecoration(labelText: 'Paid By'),
                    items: _members.map((m) => DropdownMenuItem(value: m.id, child: Text(m.name))).toList(),
                    onChanged: (v) => setModalState(() => selectedMemberId = v!),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: amountController,
                    keyboardType: const TextInputType.numberWithOptions(decimal: true),
                    decoration: const InputDecoration(labelText: 'Amount (AED)'),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: noteController,
                    decoration: const InputDecoration(labelText: 'Note (optional)'),
                    maxLines: 2,
                  ),
                  const SizedBox(height: 16),
                  AppButton(
                    label: 'Save Expense',
                    icon: Icons.add_circle_outline,
                    onPressed: () async {
                      final amount = double.tryParse(amountController.text.trim());
                      if (amount == null || amount <= 0) return;
                      try {
                        await _api.createExpense({
                          'memberId': selectedMemberId,
                          'amount': amount,
                          'date': DateTime.now().toUtc().toIso8601String(),
                          'note': noteController.text.trim().isEmpty ? null : noteController.text.trim(),
                          'deviceInfo': getDeviceInfo(),
                          'addedById': user.id,
                          'addedByName': user.name,
                        });
                        if (context.mounted) Navigator.pop(context);
                        await _load();
                      } catch (e) {
                        if (context.mounted) {
                          ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
                        }
                      }
                    },
                  ),
                ],
              );
            },
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthService>().member!;
    final currentExpenses = _expenses.where((e) => e.period == null || e.period!.isEmpty).toList();
    final myTotalSpent = currentExpenses.fold<double>(0, (sum, e) => sum + e.amount);
    final myBalance = user.contribution - myTotalSpent;
    final dateFormat = DateFormat.yMMMd();

    return Scaffold(
      backgroundColor: AppColors.background,
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _load,
              child: CustomScrollView(
                slivers: [
                  SliverToBoxAdapter(child: DashboardHeader(userName: user.name, onLogout: _logout)),
                  if (_error != null)
                    SliverToBoxAdapter(
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Text(_error!, style: const TextStyle(color: AppColors.red)),
                      ),
                    ),
                  SliverToBoxAdapter(
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Card(
                        child: Padding(
                          padding: const EdgeInsets.all(16),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.stretch,
                            children: [
                              const Text('My Dashboard', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w600)),
                              const Text('Here\'s your personal mess summary.', style: TextStyle(color: AppColors.mutedForeground)),
                              const SizedBox(height: 16),
                              AppButton(label: 'Add Expense', icon: Icons.add_circle_outline, onPressed: _showAddExpense),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ),
                  SliverPadding(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    sliver: SliverGrid(
                      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                        crossAxisCount: 2,
                        crossAxisSpacing: 12,
                        mainAxisSpacing: 12,
                        childAspectRatio: 1.3,
                      ),
                      delegate: SliverChildListDelegate([
                        StatCard(title: 'My Contribution', value: user.contribution, icon: Icons.attach_money, formatAsCurrency: true),
                        StatCard(title: 'My Total Spent', value: myTotalSpent, icon: Icons.shopping_cart, formatAsCurrency: true),
                        StatCard(title: 'My Balance', value: myBalance, icon: Icons.account_balance_wallet, formatAsCurrency: true, isPositive: myBalance >= 0),
                        StatCard(
                          title: 'Adj. Daily Rate',
                          value: _stats?.adjustedDailyRate ?? 0,
                          icon: Icons.trending_up,
                          formatAsCurrency: true,
                          isPositive: (_stats?.adjustedDailyRate ?? 0) >= 0,
                        ),
                      ]),
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
                              const Text('My Expense History', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w600)),
                              const SizedBox(height: 12),
                              if (_expenses.isEmpty)
                                const Text('No expenses yet.', style: TextStyle(color: AppColors.mutedForeground))
                              else
                                ..._expenses.map((e) {
                                  final memberName = _members.firstWhere((m) => m.id == e.memberId, orElse: () => Member(id: '', name: 'Unknown', type: 'standard', contribution: 0, role: 'member')).name;
                                  return ListTile(
                                    contentPadding: EdgeInsets.zero,
                                    title: Text(NumberFormat.simpleCurrency(name: 'AED').format(e.amount)),
                                    subtitle: Text('${dateFormat.format(DateTime.parse(e.date))} · $memberName${e.note != null ? ' · ${e.note}' : ''}'),
                                  );
                                }),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
    );
  }
}
