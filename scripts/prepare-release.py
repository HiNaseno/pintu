#!/usr/bin/env python3
"""Build source archives from one reviewed Git commit. Never read deployment secrets."""
import argparse
import gzip
import hashlib
import io
import json
import os
from pathlib import Path, PurePosixPath
import re
import subprocess
import tarfile
import tempfile
import zipfile
from datetime import datetime, timezone

ROOT = Path(__file__).resolve().parents[1]
BLOCKED_PARTS = {'.git', '.codex', '.claude', '.idea', '.vscode', 'runtime', 'node_modules', 'venv', '.venv', '__pycache__', 'dist', 'build'}
BLOCKED_SUFFIXES = ('.log', '.tmp', '.sqlite', '.sqlite3', '.db', '.db3', '.sqlite-wal', '.sqlite-shm', '.sqlite3-wal', '.sqlite3-shm', '.db-wal', '.db-shm', '.key', '.pem', '.p12', '.pfx', '.session', '.grant', '.zip', '.tar', '.tar.gz', '.tgz', '.7z', '.rar')
TOKEN = re.compile(rb'(?<![A-Za-z0-9_])(?:igw_|igd_|img_|okw_|sk-pintu-|sk-proj-|sk-)[A-Za-z0-9_-]{20,}')
PRIVATE_KEY = re.compile(rb'-----BEGIN (?:RSA |EC |OPENSSH |ENCRYPTED )?PRIVATE KEY-----')
SECRET_ASSIGNMENT = re.compile(rb'''(?im)^[ \t]*(?:export[ \t]+)?(?:[A-Z0-9_]*(?:API_KEY|GATEWAY_KEY|ENCRYPTION_KEY|ACCESS_CODE_HASH)|AUTH_TOKEN|ACCESS_TOKEN|REFRESH_TOKEN)[ \t]*[:=][ \t]*["']?([A-Za-z0-9_/$+=.-]{12,})''')
SYNTHETIC_FIXTURE_ASSIGNMENTS = {'test/pi-http.test.js': {b'synthetic-secret-never-forward'}}
PLACEHOLDERS = {b'YOUR_API_KEY_HERE', b'YOUR_KEY_HERE', b'REPLACE_WITH_YOUR_KEY', b'YOUR_ACCESS_TOKEN', b'YOUR_ENCRYPTION_KEY'}


def git(*args):
    return subprocess.check_output(['git', *args], cwd=ROOT, stderr=subprocess.PIPE)


def refuse(message):
    raise ValueError(message)


def safe_output(raw):
    output = raw.expanduser().absolute()
    if any(part.is_symlink() for part in [output, *output.parents]):
        refuse('Output path must not contain symlinks')
    output = output.resolve()
    if output == ROOT or output == ROOT.parent or '.git' in output.parts:
        refuse('Unsafe output directory')
    return output


def blocked_path(name, output_relative):
    path = PurePosixPath(name)
    if path.is_absolute() or '..' in path.parts or '\\' in name:
        refuse('Unsafe Git path')
    if output_relative and (name == output_relative or name.startswith(output_relative + '/')):
        return True
    if set(path.parts) & BLOCKED_PARTS or path.parts[:2] == ('assets', 'releases'):
        return True
    leaf = path.name.lower()
    if leaf.startswith('.env') and leaf != '.env.example':
        return True
    if leaf in {'ai api.rtf', 'release-manifest.json', '.npmrc', '.netrc', '.git-credentials'}:
        return True
    if re.fullmatch(r'(?:auth|credentials?|grants?|sessions?|tokens?)(?:[-_.].*)?\.(?:json|jsonl|toml|ya?ml|txt)', leaf):
        return True
    return leaf.endswith(BLOCKED_SUFFIXES)


def scan(name, content):
    # Fixtures receive the same scan as application source; no blanket test-directory exemption.
    if PRIVATE_KEY.search(content) or TOKEN.search(content):
        refuse(f'Credential pattern detected: {name}')
    for match in SECRET_ASSIGNMENT.finditer(content):
        if match.group(1) not in PLACEHOLDERS and match.group(1) not in SYNTHETIC_FIXTURE_ASSIGNMENTS.get(name, set()):
            refuse(f'Credential assignment detected: {name}')
    try:
        document = json.loads(content)
    except (ValueError, UnicodeDecodeError):
        document = None
    def has_login(value):
        if isinstance(value, dict):
            if all(isinstance(value.get(key), str) and len(value[key]) >= 12 for key in ('access_token', 'refresh_token')):
                return True
            return any(has_login(item) for item in value.values())
        return isinstance(value, list) and any(has_login(item) for item in value)
    if has_login(document):
        refuse(f'Login credential document detected: {name}')


def clean_tree(output_relative):
    if subprocess.run(['git', 'diff', '--quiet', '--ignore-submodules=none'], cwd=ROOT).returncode or subprocess.run(['git', 'diff', '--cached', '--quiet', '--ignore-submodules=none'], cwd=ROOT).returncode:
        refuse('Commit all reviewed changes before building a release')
    new = git('ls-files', '--others', '--exclude-standard', '-z').split(b'\0')
    remaining = [item.decode() for item in new if item and not (output_relative and (item.decode() == output_relative or item.decode().startswith(output_relative + '/')))]
    if remaining:
        refuse('Untracked source files remain; review and commit or ignore them before release')


def build(commit, output):
    output_relative = output.relative_to(ROOT).as_posix() if output.is_relative_to(ROOT) else None
    clean_tree(output_relative)
    commit = git('rev-parse', '--verify', f'{commit}^{{commit}}').decode().strip()
    stamp = int(git('show', '-s', '--format=%ct', commit))
    tree = git('ls-tree', '-rz', '--full-tree', commit).split(b'\0')
    files = []
    excluded = []
    for entry in tree:
        if not entry:
            continue
        header, raw_name = entry.split(b'\t', 1)
        mode, kind, oid = header.split()
        name = raw_name.decode('utf-8')
        if mode not in {b'100644', b'100755'} or kind != b'blob':
            refuse(f'Symlinks and submodules are not release source: {name}')
        if blocked_path(name, output_relative):
            excluded.append(name)
            continue
        content = git('cat-file', 'blob', oid.decode())
        scan(name, content)
        files.append((name, int(mode, 8) & 0o777, content))
    package = next((content for name, _, content in files if name == 'package.json'), None)
    if package is None:
        refuse('Commit has no package.json')
    version = json.loads(package)['version']
    if not re.fullmatch(r'[0-9]+\.[0-9]+\.[0-9]+(?:-[a-zA-Z0-9.-]+)?', version):
        refuse('Invalid release version')
    prefix = f'pintu-v{version}'
    manifest = {
        'version': version, 'commit': commit,
        'commitTime': datetime.fromtimestamp(stamp, timezone.utc).isoformat(),
        'snapshot': 'fixed Git commit blobs; working tree clean',
        'secretScan': 'credential patterns, private keys and login documents: no matches; one exact public test sentinel allowed only at its fixture path',
        'excluded': excluded,
        'files': [{'path': name, 'mode': oct(mode), 'bytes': len(content), 'sha256': hashlib.sha256(content).hexdigest()} for name, mode, content in files],
    }
    manifest_bytes = (json.dumps(manifest, ensure_ascii=False, indent=2) + '\n').encode()
    archive_files = files + [('release-manifest.json', 0o644, manifest_bytes)]
    zip_buffer = io.BytesIO()
    date_tuple = datetime.fromtimestamp(max(stamp, 315532800), timezone.utc).timetuple()[:6]
    with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
        for name, mode, content in archive_files:
            info = zipfile.ZipInfo(f'{prefix}/{name}', date_tuple)
            info.create_system = 3
            info.external_attr = (0o100000 | mode) << 16
            info.compress_type = zipfile.ZIP_DEFLATED
            archive.writestr(info, content)
    tar_buffer = io.BytesIO()
    with gzip.GzipFile(fileobj=tar_buffer, mode='wb', filename='', mtime=0) as compressed:
        with tarfile.open(fileobj=compressed, mode='w') as archive:
            for name, mode, content in archive_files:
                info = tarfile.TarInfo(f'{prefix}/{name}')
                info.size, info.mode, info.mtime = len(content), mode, stamp
                archive.addfile(info, io.BytesIO(content))
    artifacts = {
        f'{prefix}-source.zip': zip_buffer.getvalue(),
        f'{prefix}-source.tar.gz': tar_buffer.getvalue(),
        f'{prefix}-manifest.json': manifest_bytes,
    }
    artifacts['SHA256SUMS'] = ''.join(f'{hashlib.sha256(content).hexdigest()}  {name}\n' for name, content in sorted(artifacts.items())).encode()
    return manifest, artifacts


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--commit', default='HEAD', help='Reviewed commit or tag; resolved to a full commit SHA')
    parser.add_argument('--output', type=Path, default=ROOT / 'assets/releases')
    parser.add_argument('--dry-run', action='store_true', help='Validate and build in memory without writing files')
    args = parser.parse_args()
    try:
        output = safe_output(args.output)
        manifest, artifacts = build(args.commit, output)
        if not args.dry_run:
            output.parent.mkdir(parents=True, exist_ok=True)
            # Stage every artifact first; publish checksums last. No archive reads the worktree.
            with tempfile.TemporaryDirectory(prefix='.pintu-release-', dir=output.parent) as temporary:
                staged = Path(temporary)
                for name, content in artifacts.items():
                    (staged / name).write_bytes(content)
                output.mkdir(parents=True, exist_ok=True)
                for name in artifacts:
                    if (output / name).is_symlink():
                        refuse('Artifact destination must not be a symlink')
                for name in artifacts:
                    os.replace(staged / name, output / name)
        print(json.dumps({'version': manifest['version'], 'commit': manifest['commit'], 'sourceFiles': len(manifest['files']), 'sourceBytes': sum(item['bytes'] for item in manifest['files']), 'dryRun': args.dry_run, 'output': str(output)}, ensure_ascii=False))
    except (ValueError, subprocess.CalledProcessError, OSError, KeyError, json.JSONDecodeError) as error:
        message = str(error) if not isinstance(error, subprocess.CalledProcessError) else 'Git operation failed; use a reviewed local commit'
        parser.exit(1, f'Release refused: {message}\n')


if __name__ == '__main__':
    main()
