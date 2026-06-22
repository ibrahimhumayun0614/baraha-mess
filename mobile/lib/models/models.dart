class ApiResponse<T> {
  final bool success;
  final T? data;
  final String? error;

  ApiResponse({required this.success, this.data, this.error});

  factory ApiResponse.fromJson(Map<String, dynamic> json, T Function(dynamic) fromJsonT) {
    return ApiResponse(
      success: json['success'] == true,
      data: json['data'] != null ? fromJsonT(json['data']) : null,
      error: json['error'] as String?,
    );
  }
}

typedef MemberType = String; // 'standard' | 'reduced'

class Member {
  final String id;
  final String name;
  final MemberType type;
  final double contribution;
  final String role;
  final int? days;

  Member({
    required this.id,
    required this.name,
    required this.type,
    required this.contribution,
    required this.role,
    this.days,
  });

  factory Member.fromJson(Map<String, dynamic> json) => Member(
        id: json['id'] as String,
        name: json['name'] as String,
        type: json['type'] as String,
        contribution: (json['contribution'] as num).toDouble(),
        role: json['role'] as String,
        days: json['days'] as int?,
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        'type': type,
        'contribution': contribution,
        'role': role,
        if (days != null) 'days': days,
      };

  bool get isAdmin => role == 'admin';
}

class Expense {
  final String id;
  final String memberId;
  final double amount;
  final String date;
  final String? note;
  final String deviceInfo;
  final String addedById;
  final String addedByName;
  final String? period;

  Expense({
    required this.id,
    required this.memberId,
    required this.amount,
    required this.date,
    this.note,
    required this.deviceInfo,
    required this.addedById,
    required this.addedByName,
    this.period,
  });

  factory Expense.fromJson(Map<String, dynamic> json) => Expense(
        id: json['id'] as String,
        memberId: json['memberId'] as String,
        amount: (json['amount'] as num).toDouble(),
        date: json['date'] as String,
        note: json['note'] as String?,
        deviceInfo: json['deviceInfo'] as String,
        addedById: json['addedById'] as String,
        addedByName: json['addedByName'] as String,
        period: json['period'] as String?,
      );
}

class MessStats {
  final double totalContribution;
  final double totalSpent;
  final double balance;
  final double adjustedDailyRate;

  MessStats({
    required this.totalContribution,
    required this.totalSpent,
    required this.balance,
    required this.adjustedDailyRate,
  });

  factory MessStats.fromJson(Map<String, dynamic> json) => MessStats(
        totalContribution: (json['totalContribution'] as num).toDouble(),
        totalSpent: (json['totalSpent'] as num).toDouble(),
        balance: (json['balance'] as num).toDouble(),
        adjustedDailyRate: (json['adjustedDailyRate'] as num).toDouble(),
      );
}

class LoginResult {
  final String role;
  final Member? member;

  LoginResult({required this.role, this.member});

  factory LoginResult.fromJson(Map<String, dynamic> json) => LoginResult(
        role: json['role'] as String,
        member: json['member'] != null ? Member.fromJson(json['member'] as Map<String, dynamic>) : null,
      );
}
