from hashlib import sha256
import json
from pathlib import Path
import zipfile

root = Path(__file__).resolve().parents[1]
public = root / 'web/public'
manifest_bytes = (public / 'widget.manifest.json').read_bytes()
manifest = json.loads(manifest_bytes)
version, sdk = manifest['version'], manifest['file']
assert sdk == f'widget.v{version}.js'
published_bytes = (public / sdk).read_bytes()
for alias in ('widget.js', 'widget.bundle.js'):
    assert (public / alias).read_bytes() == published_bytes, alias
assert len(published_bytes) == manifest['bytes']
assert sha256(published_bytes).hexdigest() == manifest['sha256']
for mirror in (root / 'integration/v4', public / 'integration-v4'):
    assert json.loads((mirror / 'widget.manifest.json').read_bytes()) == manifest, mirror
    assert (mirror / sdk).read_bytes() == published_bytes, mirror
for manual in ('GUIA.md', 'MCP.md', 'INICIAR.html', 'PUBLICACAO.md', 'backend-session.mjs', 'mcp-auth.mjs', 'examples.test.mjs'):
    assert (root / 'integration/v4' / manual).read_text(encoding='utf-8') == (public / 'integration-v4' / manual).read_text(encoding='utf-8'), manual
controller = (public / f'integration-v4/widget-controller.v{version}.mjs').read_bytes()
assert controller == (root / 'integration/v4/widget-controller.mjs').read_bytes()
assert controller == (public / 'integration-v4/widget-controller.mjs').read_bytes()

starter = public / 'downloads/ai-support-starter.zip'
kit = public / f'downloads/ai-support-integration-v4-sdk-{version}.zip'
download_manifest = json.loads((public / 'downloads/release-manifest.json').read_bytes())
assert download_manifest['sdkVersion'] == version
for kind, artifact in [('starter', starter), ('kit', kit)]:
    data = artifact.read_bytes()
    assert download_manifest['archives'][kind] == {
        'file': artifact.name, 'bytes': len(data), 'sha256': sha256(data).hexdigest()
    }

for artifact in (starter, kit):
    with zipfile.ZipFile(artifact) as archive:
        assert archive.testzip() is None, artifact
        assert archive.read(sdk) == published_bytes, artifact
        assert json.loads(archive.read('widget.manifest.json')) == manifest, artifact
        if artifact == kit:
            installed = json.loads(archive.read('package.manifest.json'))
            assert installed['sdkVersion'] == version
            assert archive.read('widget-controller.mjs') == controller
            assert sorted(entry['file'] for entry in installed['files']) == sorted(
                name for name in archive.namelist() if name != 'package.manifest.json'
            )
            for entry in installed['files']:
                data = archive.read(entry['file'])
                assert len(data) == entry['bytes'] and sha256(data).hexdigest() == entry['sha256'], entry['file']
        else:
            assert f'/{sdk}' in archive.read('starter/index.html').decode('utf-8')
print(f'Verified SDK {version}, mirrors, standalone controller and both archives')
