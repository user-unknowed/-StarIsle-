import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

/// 扫描 lib 下全部 Dart 源码。
List<File> _libDartFiles() {
  final dir = Directory('lib');
  expect(dir.existsSync(), isTrue, reason: '未找到 lib 目录，请在项目根目录运行测试');
  return dir
      .listSync(recursive: true)
      .whereType<File>()
      .where((f) => f.path.endsWith('.dart'))
      .toList();
}

/// 从源码中提取所有的 `Student(...)` 构造调用的具名参数集合。
///
/// 通过括号深度与字符串状态跟踪，只在顶层逗号处切分参数，
/// 因此 `DateTime.now().subtract(...)` 等嵌套调用不会被误拆。
List<Set<String>> _studentConstructorArgs(String source) {
  final results = <Set<String>>[];
  final pattern = RegExp(r'Student\(');
  for (final match in pattern.allMatches(source)) {
    var depth = 1;
    var inSingle = false;
    var inDouble = false;
    var escaped = false;
    final buffer = StringBuffer();
    final segments = <String>[];

    for (var i = match.end; i < source.length; i++) {
      final ch = source[i];

      if (escaped) {
        buffer.write(ch);
        escaped = false;
        continue;
      }

      if ((inSingle || inDouble) && ch == r'\') {
        buffer.write(ch);
        escaped = true;
        continue;
      }

      if (!inDouble && ch == "'") {
        inSingle = !inSingle;
        buffer.write(ch);
        continue;
      }
      if (!inSingle && ch == '"') {
        inDouble = !inDouble;
        buffer.write(ch);
        continue;
      }

      if (inSingle || inDouble) {
        buffer.write(ch);
        continue;
      }

      if (ch == '(') {
        depth++;
        buffer.write(ch);
        continue;
      }
      if (ch == ')') {
        depth--;
        if (depth == 0) {
          break;
        }
        buffer.write(ch);
        continue;
      }
      if (ch == ',' && depth == 1) {
        segments.add(buffer.toString());
        buffer.clear();
        continue;
      }
      buffer.write(ch);
    }

    segments.add(buffer.toString());
    final args = <String>{};
    for (final segment in segments) {
      final trimmed = segment.trim();
      if (trimmed.isEmpty) continue;
      final colon = trimmed.indexOf(':');
      if (colon <= 0) continue;
      final name = trimmed.substring(0, colon).trim();
      if (RegExp(r'^[A-Za-z_][A-Za-z0-9_]*$').hasMatch(name)) {
        args.add(name);
      }
    }
    results.add(args);
  }
  return results;
}

void main() {
  test('lib 源码中不存在风险分级标识与等级标签', () {
    // 禁止出现的等级/分级标识：枚举、字段、数据库列、等级色常量。
    final forbiddenIdentifiers = RegExp(
      r'RiskLevel|riskLevel|risk_level|SeverityLevel|severity|'
      r'riskGreen|riskYellow|riskOrange|riskRed',
      caseSensitive: false,
    );

    // 禁止出现的绿/黄/橙/红等级文案与色块 Emoji。
    final forbiddenLabels = <String>[
      '轻微关注',
      '需要关注',
      '较为紧急',
      '高风险',
      '低风险',
      '中风险',
      '红色风险',
      '橙色风险',
      '黄色风险',
      '绿色风险',
      '🟢',
      '🟡',
      '🟠',
      '🔴',
    ];

    final violations = <String>[];
    for (final file in _libDartFiles()) {
      final source = file.readAsStringSync();
      for (final match in forbiddenIdentifiers.allMatches(source)) {
        final line = '\n'.allMatches(source.substring(0, match.start)).length + 1;
        violations.add('${file.path}:$line 出现 "${match.group(0)}"');
      }
      for (final label in forbiddenLabels) {
        if (source.contains(label)) {
          violations.add('${file.path} 出现等级标签 "$label"');
        }
      }
    }

    expect(violations, isEmpty, reason: violations.join('\n'));
  });

  test('Student mock 实例的字段集合完全一致', () {
    final providerFile = File('lib/providers/teacher_providers.dart');
    expect(providerFile.existsSync(), isTrue);

    final sets = _studentConstructorArgs(providerFile.readAsStringSync());
    expect(sets.length, greaterThanOrEqualTo(2), reason: '未解析到足够的 Student mock 实例');

    final expected = <String>{
      'id',
      'name',
      'className',
      'grade',
      'hasAlert',
      'lastStatusUpdate',
      'statusSummary',
      'moodTrend',
    };

    for (var i = 0; i < sets.length; i++) {
      expect(
        sets[i],
        equals(expected),
        reason: '第 ${i + 1} 个 Student mock 实例字段集合不一致：${sets[i]}',
      );
    }
  });
}
