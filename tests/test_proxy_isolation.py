"""Deployment boundary tests. Docker is the only substituted external boundary."""
import importlib.util
import json
from pathlib import Path
import subprocess
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
CHECKER = ROOT / "scripts/check-shared-proxy.py"


def route(host="example.test", upstream="web:80"):
    return {"match": [{"host": [host]}], "handle": [{"handler": "subroute", "routes": [{"handle": [{"handler": "reverse_proxy", "upstreams": [{"dial": upstream}]}]}]}]}


class ProxyCheckTests(unittest.TestCase):
    def checker(self):
        self.assertTrue(CHECKER.exists(), "read-only dedicated-owner preflight is required")
        spec = importlib.util.spec_from_file_location("proxy_check", CHECKER)
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        return module

    def check(self, *, project="vps-caddy", service="proxy", running=True, network=True, routes=None, malformed=False):
        module = self.checker()
        metadata = [{"Config": {"Labels": {"com.docker.compose.project": project, "com.docker.compose.service": service}}, "State": {"Running": running}, "NetworkSettings": {"Networks": {"edge": {}} if network else {}}}]
        config = {"apps": {"http": {"servers": {"srv0": {"routes": [route()] if routes is None else routes}}}}}
        calls = []
        def docker(args, **kwargs):
            calls.append(args)
            if args == ["docker", "inspect", "qr_caddy"]:
                return subprocess.CompletedProcess(args, 0, json.dumps(metadata), "")
            if args == ["docker", "exec", "qr_caddy", "wget", "-qO-", "http://127.0.0.1:2019/config/"]:
                return subprocess.CompletedProcess(args, 0, "bad-json" if malformed else json.dumps(config), "")
            raise AssertionError(f"preflight attempted a non-read-only or unexpected command: {args}")
        with patch.object(module.subprocess, "run", side_effect=docker):
            module.check_proxy([("example.test", "web:80")], ["edge"])
        return calls

    def test_accepts_actual_dedicated_runtime_project_and_proxy_service(self):
        # caddy-config/compose.yaml: name=vps-caddy, services.proxy,
        # container_name=qr_caddy. This is independent of the checker constant.
        self.assertEqual(len(self.check(project="vps-caddy", service="proxy")), 2)

    def test_accepts_pre_migration_legacy_owner_read_only(self):
        self.assertEqual(len(self.check(project="qr-code", service="caddy")), 2)

    def test_rejects_unknown_owner(self):
        with self.assertRaisesRegex(RuntimeError, "owner"):
            self.check(project="other", service="caddy")

    def test_rejects_dedicated_project_with_wrong_service(self):
        with self.assertRaisesRegex(RuntimeError, "owner"):
            self.check(project="vps-caddy", service="caddy")

    def test_rejects_stopped_proxy(self):
        with self.assertRaises(RuntimeError):
            self.check(running=False)

    def test_rejects_missing_proxy_network(self):
        with self.assertRaises(RuntimeError):
            self.check(network=False)

    def test_rejects_missing_host_even_if_upstream_exists(self):
        with self.assertRaises(RuntimeError):
            self.check(routes=[route("other.test")])

    def test_rejects_wrong_upstream(self):
        with self.assertRaises(RuntimeError):
            self.check(routes=[route(upstream="wrong:80")])

    def test_does_not_pair_host_and_upstream_from_sibling_routes(self):
        with self.assertRaises(RuntimeError):
            self.check(routes=[route(upstream="wrong:80"), route("other.test")])

    def test_rejects_malformed_active_configuration(self):
        with self.assertRaises(RuntimeError):
            self.check(malformed=True)

    def test_docker_failure_fails_closed_without_echoing_configuration(self):
        module = self.checker()
        with patch.object(module.subprocess, "run", side_effect=subprocess.CalledProcessError(1, "docker", stderr="private-token")):
            with self.assertRaises(RuntimeError) as error:
                module.check_proxy([("example.test", "web:80")], ["edge"])
        self.assertNotIn("private-token", str(error.exception))


class OwnershipBoundaryTests(unittest.TestCase):
    def test_deployment_entrypoints_have_no_shared_proxy_writers(self):
        # Explicit static safety boundary complements Docker-executor behavior tests.
        for directory in [ROOT / "scripts", ROOT / "deploy", ROOT / ".github/workflows"]:
            if not directory.exists():
                continue
            for path in directory.rglob("*"):
                if not path.is_file() or path.suffix not in {".py", ".sh", ".mjs", ".yml", ".yaml"} or "test" in path.name:
                    continue
                text = path.read_text(encoding="utf-8")
                with self.subTest(path=str(path.relative_to(ROOT))):
                    self.assertNotIn("qr-compose.prod.yml", text)
                    self.assertNotIn("/etc/caddy", text)
                    self.assertNotIn("/data/lsc-preprod", text)
                    self.assertNotRegex(text, r"(?m)^.*(?:up|restart|reload).*caddy\s*$")
                    self.assertNotRegex(text, r"docker network (?:connect|disconnect).*qr_caddy")

    def test_configure_script_is_advisory_and_never_fails_deploy(self):
        text = (ROOT / "deploy/configure-caddy.sh").read_text(encoding="utf-8")
        self.assertIn("||", text)
        self.assertTrue(text.rstrip().endswith("exit 0"))

    def test_production_compose_is_application_only(self):
        text = (ROOT / "docker-compose.prod.yml").read_text()
        self.assertNotRegex(text, r"(?m)^  caddy:")
        self.assertNotIn("caddy_data:", text)
        self.assertNotIn("caddy_config:", text)


if __name__ == "__main__":
    unittest.main()
