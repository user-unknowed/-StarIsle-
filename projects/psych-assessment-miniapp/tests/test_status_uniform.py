#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""状态等级废除验收：无内置等级、默认状态一致、自定义标签仍可用。

运行：python3 tests/test_status_uniform.py -v
"""
import re
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
STATUS_CF = ROOT / 'cloudfunctions/statusOperate/index.js'
STATUS_PAGE = ROOT / 'pages/teacher/status-tag'


def read(path):
    return path.read_text(encoding='utf-8') if path.exists() else ''


BUILTIN_IDS = r"builtin_(normal|monitoring|intervention|high_risk|referral_crisis)"
LEVEL_NAMES = r"['\"]监测中['\"]|['\"]干预中['\"]|['\"]转介危机['\"]|name:\s*['\"]正常['\"]|['\"]高风险['\"]"


class StatusUniformTest(unittest.TestCase):

    def test_builtin_status_list_is_empty(self):
        cf = read(STATUS_CF)
        self.assertNotIn('BUILTIN_TAGS', cf)
        self.assertNotIn('BUILTIN_TAG_IDS', cf)
        self.assertIsNone(re.search(BUILTIN_IDS, cf))
        self.assertRegex(cf, r"_builtinStatusLevels\s*:\s*\[\s*\]")

    def test_list_status_tags_returns_only_custom(self):
        cf = read(STATUS_CF)
        m = re.search(r"async\s+function\s+actionListStatusTags[\s\S]{0,600}?\n\}", cf)
        self.assertIsNotNone(m)
        body = m.group(0)
        self.assertIn('getOwnCustomTags', body)
        self.assertNotIn('concat', body)
        self.assertIn('return ok(custom)', body)

    def test_any_student_defaults_to_same_no_level(self):
        js = read(STATUS_PAGE / 'index.js')
        wxml = read(STATUS_PAGE / 'index.wxml')
        for text in (js, wxml):
            self.assertNotIn('builtinList', text)
            self.assertNotIn('builtIn', text)
        # 全部标签都来自教师自定义列表，不存在按等级给学生的默认映射
        self.assertIn('customList', js)
        self.assertIn('availableTags', js)
        self.assertIsNone(re.search(r"statusLevelConfig|levelColorMap|defaultStatusLevel", js))
        for rel in [
            'pages/teacher/student-history/index.js',
            'pages/teacher/student-history/index.wxml',
            'pages/teacher/dashboard/index.js',
            'pages/teacher/dashboard/index.wxml',
            'pages/teacher/ai-review/index.js',
            'pages/teacher/ai-review/index.wxml',
        ]:
            text = read(ROOT / rel)
            self.assertIsNone(re.search(BUILTIN_IDS, text), rel)
            self.assertIsNone(re.search(LEVEL_NAMES, text), rel)

    def test_no_builtin_five_level_copy_in_status_domain(self):
        domain = read(STATUS_CF) + read(STATUS_PAGE / 'index.js') \
            + read(STATUS_PAGE / 'index.wxml') + read(STATUS_PAGE / 'index.wxss')
        self.assertIsNone(re.search(BUILTIN_IDS, domain))
        self.assertIsNone(re.search(LEVEL_NAMES, domain))
        self.assertNotIn('系统内置标签', domain)
        self.assertNotIn('系统内置 5 个状态枚举', domain)
        self.assertNotIn('builtin-chip', domain)
        self.assertNotIn('chip-builtin-badge', domain)

    def test_custom_tags_still_available(self):
        cf = read(STATUS_CF)
        for action in ('listStatusTags', 'createTag', 'updateTag', 'removeTag', 'tagStudent'):
            self.assertRegex(cf, r"case\s+['\"]" + action + r"['\"]")
        js = read(STATUS_PAGE / 'index.js')
        for fn in ('onOpenCreateForm', 'onOpenEditForm', 'onDeleteTag', 'onToggleTagPick', 'onSubmitTagStudent'):
            self.assertIn(fn, js)
        # 生命周期快照展示保留（生效/归档/撤销，不是等级）
        for word in ('生效中', '已归档', '撤销动作'):
            self.assertIn(word, js)

    def test_docs_describe_no_builtin_levels(self):
        for doc in [ROOT / 'docs/project-overview.md',
                    Path('/workspace/docs/psych-assessment/project-overview.md')]:
            if doc.exists():
                text = read(doc)
                self.assertIn('无内置状态等级', text)


if __name__ == '__main__':
    unittest.main(verbosity=2)
