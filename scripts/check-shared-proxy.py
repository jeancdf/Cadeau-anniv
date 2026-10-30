#!/usr/bin/env python3
"""Read-only deployment preflight for the proxy owned by jeancdf/caddy-config.

This intentionally reads active Caddy JSON, rather than accepting an obsolete
file on disk. The admin endpoint is reached inside the existing container only.
"""
import argparse
import json
import subprocess
import sys


def _read_json(command):
    try:
        result = subprocess.run(command, check=True, capture_output=True, text=True, timeout=20)
        return json.loads(result.stdout)
    except (OSError, subprocess.SubprocessError, ValueError) as error:
        # Do not expose active configuration, Docker stderr or credentials.
        raise RuntimeError("Cannot read dedicated proxy state; deployment refused.") from error


def _objects(value):
    if isinstance(value, dict):
        yield value
        for child in value.values():
            yield from _objects(child)
    elif isinstance(value, list):
        for child in value:
            yield from _objects(child)


def check_proxy(sites, networks):
    metadata = _read_json(["docker", "inspect", "qr_caddy"])
    if not isinstance(metadata, list) or len(metadata) != 1:
        raise RuntimeError("Proxy metadata is unavailable; deployment refused.")
    container = metadata[0]
    labels = container.get("Config", {}).get("Labels") or {}
    if labels.get("com.docker.compose.project") != "vps-caddy" or labels.get("com.docker.compose.service") != "caddy":
        raise RuntimeError("Proxy must be owned by vps-caddy; approve and complete the caddy-config migration first.")
    if container.get("State", {}).get("Running") is not True:
        raise RuntimeError("Dedicated proxy is not running; deployment refused.")
    attached = container.get("NetworkSettings", {}).get("Networks") or {}
    for network in networks:
        if network not in attached:
            raise RuntimeError(f"Dedicated proxy is missing required network {network}.")
    config = _read_json(["docker", "exec", "qr_caddy", "wget", "-qO-", "http://127.0.0.1:2019/config/"])
    servers = config.get("apps", {}).get("http", {}).get("servers", {}) if isinstance(config, dict) else {}
    for host, upstream in sites:
        matched = False
        for server in servers.values():
            for candidate in _objects(server.get("routes", [])):
                if not any(host in matcher.get("host", []) for matcher in candidate.get("match", [])):
                    continue
                if any(handler.get("handler") == "reverse_proxy" and any(item.get("dial") == upstream for item in handler.get("upstreams", [])) for handler in _objects(candidate.get("handle", []))):
                    matched = True
                    break
            if matched:
                break
        if not matched:
            raise RuntimeError(f"Active proxy route {host} -> {upstream} is missing; change jeancdf/caddy-config first.")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--site", nargs=2, action="append", required=True, metavar=("HOST", "UPSTREAM"))
    parser.add_argument("--network", action="append", default=[])
    args = parser.parse_args()
    try:
        check_proxy(args.site, args.network)
    except (RuntimeError, TypeError, AttributeError) as error:
        print(f"Shared proxy preflight failed: {error}", file=sys.stderr)
        return 1
    print("Dedicated proxy ownership, active routes and networks verified (read only).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
