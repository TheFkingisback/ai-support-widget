"""Build all locale-specific integration downloads. Install integration/requirements.txt first."""
from hashlib import sha256
from html import escape
from io import BytesIO
from pathlib import Path
from string import Template
from zipfile import ZipFile, ZipInfo, ZIP_DEFLATED
import json
import re
import shutil
import markdown

from documents import CODE, DOCUMENTS, LABELS, PUBLIC, ROOT, STARTER, V4, key, localized_document, phrases, read


def encoded_json(value):
    return (json.dumps(value, ensure_ascii=False, indent=2) + "\n").encode()


def store(directory, name, data):
    directory.mkdir(parents=True, exist_ok=True)
    (directory / name).write_bytes(data)


def zip_bytes(files):
    output = BytesIO()
    with ZipFile(output, "w") as archive:
        for name, data in sorted(files.items()):
            entry = ZipInfo(name, date_time=(1980, 1, 1, 0, 0, 0))
            entry.create_system = 3
            entry.external_attr = 0o100644 << 16
            archive.writestr(entry, data, compress_type=ZIP_DEFLATED, compresslevel=9)
    return output.getvalue()


def integrity(name, data):
    return {"file": name, "bytes": len(data), "sha256": sha256(data).hexdigest()}


def render_manual(guide, tag, labels):
    # Stable ASCII anchors also work for scripts which the default slugifier strips.
    sections = []
    def anchor(value, separator):
        identifier = f"section-{len(sections)}"
        sections.append(identifier)
        return identifier
    renderer = markdown.Markdown(extensions=["fenced_code", "tables", "toc"],
        extension_configs={"toc": {"slugify": anchor, "toc_depth": "2-2"}}, output_format="html")
    body = renderer.convert(guide.replace("[TOC]", ""))
    return Template(read(ROOT / "integration/manual.html")).substitute(
        {name: escape(value, quote=True) for name, value in labels.items()},
        lang=tag, direction="rtl" if tag in {"ar", "arz", "ur"} else "ltr", contents=renderer.toc, body=body).encode()


def translated_code(path, translate):
    source = read(path)
    for english in CODE.get(path.name, []):
        value = translate(english)
        if english not in source:
            raise ValueError(f"Missing source text in {path.name}: {english}")
        literal = "'" + english + "'"
        if literal in source:
            source = source.replace(literal, json.dumps(value, ensure_ascii=False))
        else:
            if any(char in value for char in ("\n", "\r", "\u2028", "\u2029", "*/")):
                raise ValueError(f"Invalid comment in {path.name}")
            source = source.replace(english, value)
    return source.encode()


def sample_files(tag, translate, labels, messages, sdk, sdk_data):
    html = read(PUBLIC / "starter/index.html").replace('<html lang="en">', f'<html lang="{tag}" data-kit-locale="{tag}" dir="{"rtl" if tag in {"ar", "arz", "ur"} else "ltr"}">')
    html = html.replace("AI Support Widget sample workspace", escape(labels["sampleTitle"])).replace('aria-label="Import activity"', 'aria-label="' + escape(labels["activity"]) + '"')
    html = re.sub(r'(data-copy="([^"]+)"[^>]*>)[^<]*(<)', lambda m: m[1]+escape(messages[m[2]])+m[3], html)
    js = translated_code(PUBLIC / "starter/sample.js", translate).decode()
    # Preserve the bundled language even before the SDK (and its messages) becomes available.
    js = js.replace("'The widget script could not load. Check the SDK URL and reload the page.'", json.dumps(labels["loadError"], ensure_ascii=False))
    js = re.sub(r"copy\.(sample\w+) \?\? '[^']*'", lambda m: "copy."+m[1]+" ?? "+json.dumps(messages[m[1]], ensure_ascii=False), js)
    server = read(STARTER / "server.mjs").replace("'The sample file is missing. Extract the entire starter ZIP.'", json.dumps(labels["fileMissing"], ensure_ascii=False))
    return {
        "starter/index.html": html.encode(), "starter/sample.js": js.encode(), "server.mjs": server.encode(),
        "starter/sample.css": read(PUBLIC / "starter/sample.css").encode(), "bootstrap.mjs": translated_code(STARTER / "bootstrap.mjs", translate),
        "backend-session.mjs": translated_code(V4 / "backend-session.mjs", translate), "backend.env.example": read(V4 / "backend.env.example").encode(),
        sdk: sdk_data, "widget.manifest.json": read(PUBLIC / "widget.manifest.json").encode(),
    }


def build():
    manifest = json.loads(read(PUBLIC / "widget.manifest.json"))
    sdk, version = manifest["file"], manifest["version"]
    sdk_data = (PUBLIC / sdk).read_bytes()
    if integrity(sdk, sdk_data)["sha256"] != manifest["sha256"]:
        raise ValueError("SDK does not match manifest")
    messages = json.loads(read(ROOT / "shared/messages.json"))
    required = set(phrases())
    index = {}
    downloads, mirror = PUBLIC / "downloads", PUBLIC / "integration-v4"
    for tag, widget_messages in messages.items():
        catalog = json.loads(read(ROOT / "integration/translations" / (tag + ".json")))
        if set(catalog) != required or not all(isinstance(v, str) and v.strip() for v in catalog.values()):
            raise ValueError(f"Incomplete translation for {tag}: {sorted(required-set(catalog))}")
        def translate(value):
            return catalog[key(value)]
        labels = {k: translate(v) for k, v in LABELS.items()}
        docs = {name: localized_document(name, tag, translate) for name in DOCUMENTS}
        if len(docs["PROMPT-TENANT.txt"].strip().encode("utf-16-le")) // 2 > 2000:
            raise ValueError(f"Tenant prompt exceeds the product limit for {tag}")
        kit = {name: content.encode() for name, content in docs.items() if name != "README.md"}
        kit["INICIAR.html"] = render_manual(docs["GUIA.md"], tag, labels)
        for name in ("backend-session.mjs", "widget-controller.mjs", "mcp-auth.mjs", "examples.test.mjs"):
            kit[name] = translated_code(V4 / name, translate)
        for name, data in kit.items():
            store(mirror/tag, name, data)
        store(mirror/tag, "README.md", docs["README.md"].encode())
        for name in ("context.schema.json", "context.example.json", "backend.env.example"):
            kit[name] = read(V4 / name).encode()
        kit[sdk] = sdk_data
        kit["widget.manifest.json"] = read(PUBLIC/"widget.manifest.json").encode()
        kit["package.manifest.json"] = encoded_json({"locale": tag, "sdkVersion": version,
            "files": [integrity(name, data) for name, data in sorted(kit.items())]})
        starter = sample_files(tag, translate, labels, widget_messages, sdk, sdk_data)
        starter["README.md"] = docs["README.md"].encode()
        archives = {}
        for kind, filename, files in (("kit", f"ai-support-integration-v4-sdk-{version}.zip", kit),
                                      ("starter", "ai-support-starter.zip", starter)):
            data = zip_bytes(files)
            store(downloads/tag, filename, data)
            archives[kind] = integrity(filename, data)
        release = encoded_json({"sdkVersion": version, "locale": tag, "archives": archives})
        store(downloads/tag, "release-manifest.json", release)
        index[tag] = archives["kit"]["sha256"]
        if tag == "pt-BR":
            # The original distribution remains readable for clients serving static files without Next.js.
            for item in archives.values():
                shutil.copyfile(downloads/tag/item["file"], downloads/item["file"])
            store(downloads, "release-manifest.json", release)
            store(V4, "INICIAR.html", kit["INICIAR.html"])
    store(downloads, "locales.json", encoded_json(index))
    for name, data in ((sdk, sdk_data), ("widget.manifest.json", read(PUBLIC/"widget.manifest.json").encode())):
        store(V4, name, data)
        store(mirror, name, data)
    for name in (*DOCUMENTS, "INICIAR.html", "backend-session.mjs", "mcp-auth.mjs", "examples.test.mjs",
                 "widget-controller.mjs", "backend.env.example", "context.schema.json", "context.example.json"):
        if name != "README.md":
            store(mirror, name, read(V4/name).encode())
    store(mirror, f"widget-controller.v{version}.mjs", read(V4/"widget-controller.mjs").encode())
    print(f"Published {len(index)} manuals and {len(index)*2} localized ZIP files for SDK {version}")


if __name__ == "__main__":
    build()
