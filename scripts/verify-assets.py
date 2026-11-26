from hashlib import sha256
from html.parser import HTMLParser
import json
from pathlib import Path
import re
import sys
import zipfile

root = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(root / "integration"))
from documents import DOCUMENTS, key, localized_document, phrases

public = root / "web/public"
v4 = root / "integration/v4"
mirror = public / "integration-v4"
downloads = public / "downloads"
manifest = json.loads((public / "widget.manifest.json").read_bytes())
version, sdk = manifest["version"], manifest["file"]
assert sdk == f"widget.v{version}.js"
sdk_data = (public / sdk).read_bytes()
assert len(sdk_data) == manifest["bytes"] and sha256(sdk_data).hexdigest() == manifest["sha256"]
for path in (public/"widget.js", public/"widget.bundle.js", v4/sdk, mirror/sdk):
    assert path.read_bytes() == sdk_data, path
for path in (v4, mirror):
    assert json.loads((path/"widget.manifest.json").read_bytes()) == manifest
for name in ("GUIA.md", "MCP.md", "INICIAR.html", "PUBLICACAO.md", "ACEITE.md", "PROMPT-TENANT.txt",
             "backend-session.mjs", "mcp-auth.mjs", "examples.test.mjs", "widget-controller.mjs"):
    assert (v4/name).read_text(encoding="utf-8") == (mirror/name).read_text(encoding="utf-8"), name
assert (mirror/f"widget-controller.v{version}.mjs").read_bytes() == (v4/"widget-controller.mjs").read_bytes()


class Manual(HTMLParser):
    def __init__(self):
        super().__init__()
        self.links, self.titles, self.lang, self.direction = [], [], "", ""
        self.scripts = []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        assert tag not in {"iframe", "embed", "object", "base", "form", "img", "link"}, tag
        assert not any(k.startswith("on") for k in attrs if k != "onclick" or attrs[k] != "window.print()"), tag
        if tag == "script":
            self.scripts.append(attrs.get("id"))
            assert "src" not in attrs
        if tag == "html":
            self.lang, self.direction = attrs["lang"], attrs["dir"]
        elif tag == "a" and "href" in attrs:
            self.links.append(attrs["href"])
        elif tag == "h2":
            self.titles.append(attrs["id"])


def check_entry(entry, data):
    assert len(data) == entry["bytes"] and sha256(data).hexdigest() == entry["sha256"], entry["file"]


tags = set(json.loads((root/"shared/messages.json").read_bytes()))
index = json.loads((downloads/"locales.json").read_bytes())
assert set(index) == tags and len(set(index.values())) == len(tags)
source_keys = set(phrases())
common = {sdk, "widget.manifest.json", "backend-session.mjs", "backend.env.example"}
kit_files = common | (set(DOCUMENTS) - {"README.md"}) | {"INICIAR.html", "examples.test.mjs", "mcp-auth.mjs",
    "widget-controller.mjs", "context.example.json", "context.schema.json", "package.manifest.json"}
starter_files = common | {"README.md", "bootstrap.mjs", "server.mjs", "starter/index.html", "starter/sample.css", "starter/sample.js"}
for tag in sorted(tags):
    catalog = json.loads((root/"integration/translations"/(tag + ".json")).read_bytes())
    assert set(catalog) == source_keys, tag
    for name in DOCUMENTS:
        expected = localized_document(name, tag, lambda s: catalog[key(s)]).encode()
        assert (mirror/tag/name).read_bytes() == expected, (tag, name)
    metadata = json.loads((downloads/tag/"release-manifest.json").read_bytes())
    assert metadata["locale"] == tag and metadata["sdkVersion"] == version
    assert index[tag] == metadata["archives"]["kit"]["sha256"]
    for kind, names in (("kit", kit_files), ("starter", starter_files)):
        artifact = metadata["archives"][kind]
        path = downloads/tag/artifact["file"]
        check_entry(artifact, path.read_bytes())
        with zipfile.ZipFile(path) as z:
            assert z.testzip() is None and set(z.namelist()) == names, (tag, kind)
            assert z.read(sdk) == sdk_data and json.loads(z.read("widget.manifest.json")) == manifest
            if kind == "kit":
                installed = json.loads(z.read("package.manifest.json"))
                assert installed["sdkVersion"] == version and installed["locale"] == tag
                assert sorted(entry["file"] for entry in installed["files"]) == sorted(names - {"package.manifest.json"})
                for entry in installed["files"]:
                    name = entry["file"]
                    data = z.read(name)
                    check_entry(entry, data)
                    if (mirror/tag/name).exists():
                        assert data == (mirror/tag/name).read_bytes(), (tag, name)
                guide = z.read("GUIA.md").decode()
                html = Manual()
                html.feed(z.read("INICIAR.html").decode())
                headings = re.findall(r"^## (\d+)\. ", guide, re.M)
                assert headings == [str(n) for n in range(1,18)] and len(html.titles) == len(headings), tag
                assert html.scripts == ["controls"], tag
                assert html.lang == tag and html.direction == ("rtl" if tag in {"ar","arz","ur"} else "ltr")
                assert set(link[1:] for link in html.links if link.startswith("#")) == set(html.titles), tag
                assert all(link in {"https://developers.openai.com/api/docs/models/gpt-4.1-mini", "https://openrouter.ai/api/v1/models"} for link in html.links if link.startswith("https://")), tag
                assert all(link in names for link in html.links if not link.startswith(("#", "https://"))), tag
                assert 0 < len(z.read("PROMPT-TENANT.txt").decode().strip().encode("utf-16-le")) // 2 <= 2000
            else:
                assert z.read("README.md") == (mirror/tag/"README.md").read_bytes()
                sample = z.read("starter/index.html").decode()
                assert f'data-kit-locale="{tag}"' in sample and f'/{sdk}' in sample
    if tag == "pt-BR":
        for name in ["release-manifest.json", *[a["file"] for a in metadata["archives"].values()]]:
            assert (downloads/tag/name).read_bytes() == (downloads/name).read_bytes()
print(f"Verified SDK {version}, {len(tags)} complete manuals, both archives per locale and all file hashes")
