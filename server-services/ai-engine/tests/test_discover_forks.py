"""
test_discover_forks.py - Fork 仓库发现与 manifest 校验单元测试

所属模块：ai-engine/tests
功能简述：
    验证 discover_forks.py 的回退列表与 manifest 写入/校验逻辑：
      1. 回退列表（test_fallback_list_has_schema_and_ge3）：须至少 3 项，
         每项含 repo_id/repo_url/description/language/local_path，且 url 以 http 开头
      2. manifest 写入与校验（test_write_and_validate）：
         write_manifest 写入后 total_forks/failed_repos 字段正确，
         validate_manifest 对完整数据返回空错误列表，
         缺少必填字段时返回非空错误列表
测试对象：scripts.discover_forks 的 build_fallback_fork_list、
         write_manifest、validate_manifest、DEFAULT_MANIFEST_PATH
"""
import json, pathlib
from scripts.discover_forks import (
    build_fallback_fork_list, write_manifest, validate_manifest,
    DEFAULT_MANIFEST_PATH,
)


def test_fallback_list_has_schema_and_ge3():
    """回退列表：须 >=3 项，每项含必填字段且 url 以 http 开头。"""
    lst = build_fallback_fork_list()
    assert len(lst) >= 3
    for item in lst:
        # 必填字段：repo_id、repo_url、description、language、local_path
        for k in ("repo_id","repo_url","description","language","local_path"):
            assert k in item, f"missing {k}"
        assert item["repo_url"].startswith("http")


def test_write_and_validate(tmp_path, monkeypatch):
    """manifest 写入与校验：合法数据无错误，缺失字段时返回错误。"""
    # 将默认 manifest 路径重定向到临时目录，避免污染真实文件
    monkeypatch.setattr("scripts.discover_forks.DEFAULT_MANIFEST_PATH",
                        str(tmp_path / "fork_manifest.json"))
    forks = build_fallback_fork_list()
    path = write_manifest(forks, failed_repos=[{"repo_id":"x/y","reason":"timeout"}])
    data = json.loads(pathlib.Path(path).read_text(encoding="utf-8"))
    # total_forks 与 failed_repos 字段须正确
    assert data["total_forks"] == len(forks) and data["failed_repos"][0]["repo_id"] == "x/y"
    # 完整数据校验应通过（无错误）
    assert validate_manifest(data) == []
    # 删除 fork[0] 的 repo_id 后应返回至少一个错误
    del data["forks"][0]["repo_id"]
    errs = validate_manifest(data)
    assert len(errs) >= 1
