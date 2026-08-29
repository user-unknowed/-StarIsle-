"""discover_forks manifest schema & fallback list tests."""
import json, pathlib
from scripts.discover_forks import (
    build_fallback_fork_list, write_manifest, validate_manifest,
    DEFAULT_MANIFEST_PATH,
)

def test_fallback_list_has_schema_and_ge3():
    lst = build_fallback_fork_list()
    assert len(lst) >= 3
    for item in lst:
        for k in ("repo_id","repo_url","description","language","local_path"):
            assert k in item, f"missing {k}"
        assert item["repo_url"].startswith("http")

def test_write_and_validate(tmp_path, monkeypatch):
    monkeypatch.setattr("scripts.discover_forks.DEFAULT_MANIFEST_PATH",
                        str(tmp_path / "fork_manifest.json"))
    forks = build_fallback_fork_list()
    path = write_manifest(forks, failed_repos=[{"repo_id":"x/y","reason":"timeout"}])
    data = json.loads(pathlib.Path(path).read_text(encoding="utf-8"))
    assert data["total_forks"] == len(forks) and data["failed_repos"][0]["repo_id"] == "x/y"
    assert validate_manifest(data) == []
    del data["forks"][0]["repo_id"]
    errs = validate_manifest(data)
    assert len(errs) >= 1
