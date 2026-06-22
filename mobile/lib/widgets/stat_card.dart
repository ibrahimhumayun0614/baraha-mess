import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../theme/app_colors.dart';

class StatCard extends StatelessWidget {
  const StatCard({
    super.key,
    required this.title,
    required this.value,
    required this.icon,
    this.formatAsCurrency = false,
    this.isPositive,
  });

  final String title;
  final double value;
  final IconData icon;
  final bool formatAsCurrency;
  final bool? isPositive;

  @override
  Widget build(BuildContext context) {
    final formatted = formatAsCurrency
        ? NumberFormat.simpleCurrency(name: 'AED').format(value)
        : value.toStringAsFixed(2);

    Color valueColor = AppColors.foreground;
    if (isPositive == true) valueColor = AppColors.green;
    if (isPositive == false) valueColor = AppColors.red;

    return Card(
      elevation: 3,
      child: Container(
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(12),
          gradient: LinearGradient(
            colors: [Colors.grey.shade50, Colors.white],
            begin: Alignment.centerLeft,
            end: Alignment.centerRight,
          ),
        ),
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Text(
                    title,
                    style: const TextStyle(fontSize: 13, color: AppColors.mutedForeground, fontWeight: FontWeight.w500),
                  ),
                ),
                Icon(icon, size: 20, color: AppColors.mutedForeground),
              ],
            ),
            const SizedBox(height: 12),
            Text(
              formatted,
              style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: valueColor),
            ),
          ],
        ),
      ),
    );
  }
}

class DashboardHeader extends StatelessWidget {
  const DashboardHeader({super.key, required this.userName, required this.onLogout});

  final String userName;
  final VoidCallback onLogout;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      color: Colors.white,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
      child: Column(
        children: [
          Row(
            children: [
              const Icon(Icons.restaurant, color: AppColors.primaryBlue, size: 32),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  'Baraha Bad Boys Mess Dashboard',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('Welcome, $userName', style: const TextStyle(color: AppColors.mutedForeground, fontSize: 14)),
              OutlinedButton(onPressed: onLogout, child: const Text('Logout')),
            ],
          ),
        ],
      ),
    );
  }
}
