"""Release safety tests run only against synthetic temporary Git repositories."""
import hashlib
import io
import json
import os
from pathlib import Path
import shutil
import subprocess
import tarfile
import tempfile
import unittest
import zipfile

SOURCE = Path(__file__).resolve().parents[1] / 'scripts/prepare-release.py'


class ReleaseToolTest(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory(prefix='pintu-release-test-')
        self.addCleanup(self.temporary.cleanup)
        self.root = Path(self.temporary.name)
        (self.root / 'scripts').mkdir()
        shutil.copyfile(SOURCE, self.root / 'scripts/prepare-release.py')
        (self.root / 'package.json').write_text('{"name":"fixture","version":"0.3.0"}\n')
        (self.root / 'README.md').write_text('Synthetic public source.\n')
        self.git('init', '-q')
        self.git('config', 'user.name', 'Release Fixture')
        self.git('config', 'user.email', 'fixture@example.invalid')
        self.commit()

    def git(self, *args):
        return subprocess.check_output(['git', *args], cwd=self.root, stderr=subprocess.PIPE)

    def commit(self):
        self.git('add', '-A')
        self.git('commit', '-qm', 'Synthetic release fixture')
        return self.git('rev-parse', 'HEAD').decode().strip()

    def run_tool(self, *args, expected=0):
        result = subprocess.run(['python3', str(self.root / 'scripts/prepare-release.py'), *args], cwd=self.root, capture_output=True, text=True)
        self.assertEqual(result.returncode, expected, result.stderr)
        return result

    def test_fixed_commit_bytes_manifest_archives_and_precise_checksums(self):
        commit = self.git('rev-parse', 'HEAD').decode().strip()
        output = self.root / 'assets/releases'
        output.mkdir(parents=True)
        (output / 'pintu-v0.3.0-stale.txt').write_text('not a current artifact')
        self.run_tool('--commit', commit)
        manifest = json.loads((output / 'pintu-v0.3.0-manifest.json').read_text())
        self.assertEqual(manifest['commit'], commit)
        zip_bytes = (output / 'pintu-v0.3.0-source.zip').read_bytes()
        tar_bytes = (output / 'pintu-v0.3.0-source.tar.gz').read_bytes()
        with zipfile.ZipFile(io.BytesIO(zip_bytes)) as zip_archive, tarfile.open(fileobj=io.BytesIO(tar_bytes), mode='r:gz') as tar_archive:
            for item in manifest['files']:
                name = 'pintu-v0.3.0/' + item['path']
                content = zip_archive.read(name)
                self.assertEqual(content, tar_archive.extractfile(name).read())
                self.assertEqual(hashlib.sha256(content).hexdigest(), item['sha256'])
            self.assertEqual(zip_archive.read('pintu-v0.3.0/release-manifest.json'), (output / 'pintu-v0.3.0-manifest.json').read_bytes())
        checksums = (output / 'SHA256SUMS').read_text().splitlines()
        self.assertEqual(len(checksums), 3)
        self.assertNotIn('stale', '\n'.join(checksums))
        for line in checksums:
            digest, name = line.split('  ')
            self.assertEqual(digest, hashlib.sha256((output / name).read_bytes()).hexdigest())
        self.run_tool('--commit', commit)
        self.assertEqual(zip_bytes, (output / 'pintu-v0.3.0-source.zip').read_bytes())
        self.assertEqual(tar_bytes, (output / 'pintu-v0.3.0-source.tar.gz').read_bytes())

    def test_dry_run_writes_nothing(self):
        result = self.run_tool('--dry-run')
        self.assertTrue(json.loads(result.stdout)['dryRun'])
        self.assertFalse((self.root / 'assets').exists())

    def test_dirty_tracked_index_and_untracked_source_are_refused(self):
        readme = self.root / 'README.md'
        readme.write_text('unreviewed\n')
        self.run_tool('--dry-run', expected=1)
        self.git('add', 'README.md')
        self.run_tool('--dry-run', expected=1)
        self.git('reset', '--hard', '-q', 'HEAD')
        (self.root / 'forgotten.js').write_text('unreviewed\n')
        self.run_tool('--dry-run', expected=1)

    def test_explicit_output_is_excluded_even_if_not_gitignored(self):
        output = self.root / 'downloads'
        output.mkdir()
        (output / 'old.zip').write_bytes(b'old generated output')
        self.run_tool('--output', str(output))
        manifest = json.loads((output / 'pintu-v0.3.0-manifest.json').read_text())
        self.assertFalse(any(item['path'].startswith('downloads/') for item in manifest['files']))
        self.run_tool('--output', str(output), '--dry-run')

    def test_symlinks_and_output_symlinks_are_refused(self):
        (self.root / 'link').symlink_to('README.md')
        self.commit()
        self.run_tool('--dry-run', expected=1)
        self.git('rm', '-q', 'link')
        self.commit()
        (self.root / 'out-link').symlink_to(self.root / 'other-output')
        self.run_tool('--output', str(self.root / 'out-link'), '--dry-run', expected=1)

    def test_credential_patterns_are_not_exempt_in_test_fixtures(self):
        (self.root / 'test').mkdir()
        fake_secret = 'sk-pintu-' + 'A' * 40
        (self.root / 'test/unsafe-fixture.txt').write_text(fake_secret)
        self.commit()
        result = self.run_tool('--dry-run', expected=1)
        self.assertIn('Credential pattern detected', result.stderr)
        self.assertNotIn(fake_secret, result.stderr)

    def test_private_key_and_secret_assignment_refused(self):
        (self.root / 'public.txt').write_text('OPENAI_API_KEY=' + 'A' * 40)
        self.commit()
        self.run_tool('--dry-run', expected=1)
        (self.root / 'public.txt').write_text('-----BEGIN ' + 'PRIVATE KEY-----\nfixture\n')
        self.commit()
        self.run_tool('--dry-run', expected=1)

    def test_runtime_credentials_database_sidecars_and_archives_excluded(self):
        names = ['runtime/session.sqlite', 'runtime/session.sqlite-wal', '.codex/auth.json', '.env', 'sessions.json', 'notes.db-shm', 'archive.zip', 'private.key', 'AI API.rtf']
        for name in names:
            file = self.root / name
            file.parent.mkdir(parents=True, exist_ok=True)
            file.write_text('synthetic private local material')
        (self.root / '.env.example').write_text('OPENAI_API_KEY=\n')
        self.commit()
        self.run_tool()
        manifest = json.loads((self.root / 'assets/releases/pintu-v0.3.0-manifest.json').read_text())
        listed = {item['path'] for item in manifest['files']}
        self.assertTrue(listed.isdisjoint(names))
        self.assertIn('.env.example', listed)

    def test_empty_env_assignments_do_not_capture_following_lines(self):
        (self.root / '.env.example').write_text('OPENAI_API_KEY=\nOPENAI_BASE_URL=https://example.invalid/v1\nPINTU_ENCRYPTION_KEY=\n# a long comment should stay a comment\n')
        self.commit()
        self.run_tool('--dry-run')
        (self.root / '.env.example').write_text('OPENAI_API_KEY=' + 'A' * 40 + '\n')
        self.commit()
        self.run_tool('--dry-run', expected=1)

    def test_only_exact_public_sentinel_at_exact_fixture_path_allowed(self):
        (self.root / 'test').mkdir()
        fixture = self.root / 'test/pi-http.test.js'
        fixture.write_text("OPENAI_API_KEY: 'synthetic-secret-never-forward'\n")
        self.commit()
        self.run_tool('--dry-run')
        fixture.write_text("OPENAI_API_KEY: '" + 'A' * 40 + "'\n")
        self.commit()
        self.run_tool('--dry-run', expected=1)
        fixture.unlink()
        (self.root / 'application.js').write_text("OPENAI_API_KEY: 'synthetic-secret-never-forward'\n")
        self.commit()
        self.run_tool('--dry-run', expected=1)

    def test_pinned_old_commit_does_not_read_new_head_or_worktree(self):
        old = self.git('rev-parse', 'HEAD').decode().strip()
        (self.root / 'README.md').write_text('New version only\n')
        self.commit()
        self.run_tool('--commit', old)
        archive = self.root / 'assets/releases/pintu-v0.3.0-source.zip'
        with zipfile.ZipFile(archive) as data:
            self.assertEqual(data.read('pintu-v0.3.0/README.md'), b'Synthetic public source.\n')


if __name__ == '__main__':
    unittest.main()
