#!/usr/bin/env python3
"""Сборка APK «Легенды Дракономании» (WebView-оболочка для мобильной версии игры).

Не нужны Android Studio, Gradle и Android SDK: APK собирается из исходников в android/project
(smali-код + иконка) и подписывается отладочным/своим ключом.

Конвейер:
  1. smali -> classes.dex          (ассемблер smali, входит в apktool.jar)
  2. AndroidManifest.xml -> бинарный AXML (кодируется здесь; ID атрибутов — из AOSP public.xml)
  3. res/mipmap/ic_launcher.png -> resources.arsc (таблица ресурсов, кодируется здесь)
  4. ZIP -> подпись APK Signature Scheme v1+v2 (apksigner.jar), ключ — keytool

Инструменты (по умолчанию ищутся в ~/apkbuild-tools, см. README):
  JAVA            — java (любой JRE 11+; в песочнице — из пакета jdk4py)
  APKTOOL_JAR     — apktool.jar (нужен только ради smali)
  APKSIGNER_JAR   — apksigner.jar из Android build-tools
  KEYTOOL         — keytool (по умолчанию из JAVA_HOME / PATH)

Использование:
  python3 android/build_apk.py --server-url https://<сервис>.onrender.com/mobile/
"""
import argparse
import os
import pathlib
import shutil
import struct
import subprocess
import sys
import zipfile

HERE = pathlib.Path(__file__).resolve().parent
PROJECT = HERE / "project"
BUILD = HERE / "build"
PLACEHOLDER = "__SERVER_URL__"
APP_LABEL = "Легенды Дракономании"
PACKAGE = "com.dragonmania.mobile"
ANDROID_NS = "http://schemas.android.com/apk/res/android"
NO_INDEX = 0xFFFFFFFF

# ID атрибутов фреймворка Android (AOSP public.xml; проверено по androguard/core/resources/public.xml)
ATTR_IDS = [
    ("versionCode", 0x0101021B),
    ("versionName", 0x0101021C),
    ("minSdkVersion", 0x0101020C),
    ("targetSdkVersion", 0x01010270),
    ("allowBackup", 0x01010280),
    ("hardwareAccelerated", 0x010102D3),
    ("icon", 0x01010002),
    ("label", 0x01010001),
    ("supportsRtl", 0x010103AF),
    ("theme", 0x01010000),
    ("name", 0x01010003),
    ("configChanges", 0x0101001F),
    ("exported", 0x01010010),
    ("windowSoftInputMode", 0x0101022B),
]

THEME_REF = 0x01030241  # @android:style/Theme.Material.Light.NoActionBar
ICON_REF = 0x7F010000   # @mipmap/ic_launcher (тип 1, запись 0 нашей таблицы ресурсов)

# configChanges: orientation|screenSize|screenLayout|keyboardHidden|keyboard|smallestScreenSize
CONFIG_CHANGES = 0x0080 | 0x0400 | 0x0100 | 0x0020 | 0x0010 | 0x0800


# ---------------------------------------------------------------- строковый пул (UTF-16)
class StringPool:
    def __init__(self):
        self.strings = []
        self.index = {}

    def add(self, s):
        if s not in self.index:
            self.index[s] = len(self.strings)
            self.strings.append(s)
        return self.index[s]

    def encode(self):
        offsets, data = [], bytearray()
        for s in self.strings:
            offsets.append(len(data))
            data += struct.pack("<H", len(s)) + s.encode("utf-16-le") + b"\x00\x00"
        while len(data) % 4:
            data += b"\x00"
        strings_start = 28 + 4 * len(self.strings)
        size = strings_start + len(data)
        head = struct.pack("<HHIIIIII", 0x0001, 28, size, len(self.strings), 0, 0, strings_start, 0)
        return head + b"".join(struct.pack("<I", o) for o in offsets) + bytes(data)


# ---------------------------------------------------------------- бинарный AndroidManifest.xml
def attr_str(pool, ns, name, value):
    v = pool.add(value)
    return (ns, pool.add(name), v, 0x03, v)  # TYPE_STRING


def attr_int(pool, ns, name, value):
    return (ns, pool.add(name), NO_INDEX, 0x10, value & 0xFFFFFFFF)  # TYPE_INT_DEC


def attr_hex(pool, ns, name, value):
    return (ns, pool.add(name), NO_INDEX, 0x11, value & 0xFFFFFFFF)  # TYPE_INT_HEX


def attr_bool(pool, ns, name, value):
    return (ns, pool.add(name), NO_INDEX, 0x12, 0xFFFFFFFF if value else 0)  # TYPE_INT_BOOLEAN


def attr_ref(pool, ns, name, res_id):
    return (ns, pool.add(name), NO_INDEX, 0x01, res_id)  # TYPE_REFERENCE


def start_el(pool, name, attrs, ns=NO_INDEX):
    body = struct.pack("<II", 1, NO_INDEX)  # lineNumber, comment
    body += struct.pack("<II", ns, pool.add(name))
    body += struct.pack("<HHHHHH", 20, 20, len(attrs), 0, 0, 0)
    for a_ns, a_name, raw, dtype, data in attrs:
        body += struct.pack("<IIIHBBI", a_ns, a_name, raw, 8, 0, dtype, data)
    return struct.pack("<HHI", 0x0102, 16, 8 + len(body)) + body


def end_el(pool, name, ns=NO_INDEX):
    body = struct.pack("<IIII", 1, NO_INDEX, ns, pool.add(name))
    return struct.pack("<HHI", 0x0103, 16, 8 + len(body)) + body


def build_manifest(min_sdk, target_sdk, version_code, version_name):
    pool = StringPool()
    # Имена атрибутов с ID идут первыми: ResourceMap сопоставляет их индексам строк 0..N-1
    for name, _ in ATTR_IDS:
        pool.add(name)
    android = pool.add("android")
    android_uri = pool.add(ANDROID_NS)
    A = android_uri  # ns атрибута android:* — индекс строки URI пространства имён

    def a(name, value_kind, value):
        if value_kind == "str":
            return attr_str(pool, A, name, value)
        if value_kind == "int":
            return attr_int(pool, A, name, value)
        if value_kind == "hex":
            return attr_hex(pool, A, name, value)
        if value_kind == "bool":
            return attr_bool(pool, A, name, value)
        if value_kind == "ref":
            return attr_ref(pool, A, name, value)
        raise ValueError(value_kind)

    nodes = b""
    nodes += struct.pack("<HHIII", 0x0100, 16, 24, 1, NO_INDEX) + struct.pack("<II", android, android_uri)
    nodes += start_el(pool, "manifest", [
        attr_str(pool, NO_INDEX, "package", PACKAGE),
        a("versionCode", "int", version_code),
        a("versionName", "str", version_name),
    ])
    nodes += start_el(pool, "uses-sdk", [a("minSdkVersion", "int", min_sdk), a("targetSdkVersion", "int", target_sdk)])
    nodes += end_el(pool, "uses-sdk")
    nodes += start_el(pool, "uses-permission", [attr_str(pool, A, "name", "android.permission.INTERNET")])
    nodes += end_el(pool, "uses-permission")
    nodes += start_el(pool, "uses-permission", [attr_str(pool, A, "name", "android.permission.ACCESS_NETWORK_STATE")])
    nodes += end_el(pool, "uses-permission")
    nodes += start_el(pool, "application", [
        a("allowBackup", "bool", True),
        a("hardwareAccelerated", "bool", True),
        a("icon", "ref", ICON_REF),
        a("label", "str", APP_LABEL),
        a("supportsRtl", "bool", True),
        a("theme", "ref", THEME_REF),
    ])
    nodes += start_el(pool, "activity", [
        a("name", "str", f"{PACKAGE}.MainActivity"),
        a("configChanges", "hex", CONFIG_CHANGES),
        a("exported", "bool", True),
        a("windowSoftInputMode", "hex", 0x10),  # adjustResize
    ])
    nodes += start_el(pool, "intent-filter", [])
    nodes += start_el(pool, "action", [a("name", "str", "android.intent.action.MAIN")])
    nodes += end_el(pool, "action")
    nodes += start_el(pool, "category", [a("name", "str", "android.intent.category.LAUNCHER")])
    nodes += end_el(pool, "category")
    nodes += end_el(pool, "intent-filter")
    nodes += end_el(pool, "activity")
    nodes += end_el(pool, "application")
    nodes += end_el(pool, "manifest")
    nodes += struct.pack("<HHIII", 0x0101, 16, 24, 1, NO_INDEX) + struct.pack("<II", android, android_uri)

    strings = pool.encode()
    res_map_body = b"".join(struct.pack("<I", rid) for _, rid in ATTR_IDS)
    res_map = struct.pack("<HHI", 0x0180, 8, 8 + len(res_map_body)) + res_map_body
    total = 8 + len(strings) + len(res_map) + len(nodes)
    return struct.pack("<HHI", 0x0003, 8, total) + strings + res_map + nodes


# ---------------------------------------------------------------- resources.arsc (один файл-иконка)
def build_resources_arsc(icon_path_in_apk):
    # Глобальный пул: путь к файлу иконки
    gpool = StringPool()
    file_idx = gpool.add(icon_path_in_apk)
    global_strings = gpool.encode()

    # Пул типов и пул имён записей пакета
    type_pool = StringPool()
    type_pool.add("mipmap")
    type_strings = type_pool.encode()
    key_pool = StringPool()
    key_pool.add("ic_launcher")
    key_strings = key_pool.encode()

    pkg_header_size = 288
    type_strings_off = pkg_header_size
    key_strings_off = type_strings_off + len(type_strings)

    # ResTable_typeSpec: id=1, entryCount=1, flags=0
    type_spec = struct.pack("<HHIBBHI", 0x0202, 16, 16 + 4, 1, 0, 0, 1) + struct.pack("<I", 0)

    # ResTable_type: id=1, config (64 байта, любая конфигурация), одна запись
    config = struct.pack("<I", 64) + b"\x00" * 60
    type_hdr_size = 20 + 64
    entries_start = type_hdr_size + 4  # один offset
    entry = struct.pack("<HHI", 8, 0, 0) + struct.pack("<HBBI", 8, 0, 0x03, file_idx)  # ResTable_entry + Res_value(string)
    type_body = struct.pack("<I", 0) + entry  # offset 0 -> первая запись
    type_chunk_size = entries_start + len(entry)
    type_chunk = struct.pack("<HHIBBHII", 0x0201, type_hdr_size, type_chunk_size, 1, 0, 0, 1, entries_start) + config + type_body

    package_body = type_strings + key_strings + type_spec + type_chunk
    package_size = pkg_header_size + len(package_body)
    name = PACKAGE.encode("utf-16-le").ljust(256, b"\x00")
    pkg_header = struct.pack("<HHI", 0x0200, pkg_header_size, package_size) + struct.pack("<I", 0x7F) + name
    pkg_header += struct.pack("<IIIII", type_strings_off, 1, key_strings_off, 1, 0)
    package = pkg_header + package_body

    total = 12 + len(global_strings) + len(package)
    return struct.pack("<HHII", 0x0002, 12, total, 1) + global_strings + package


# ---------------------------------------------------------------- сборка
def run(cmd, **kw):
    print("+", " ".join(str(c) for c in cmd))
    subprocess.run(cmd, check=True, **kw)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--server-url", required=True, help="адрес мобильной версии на сервере, напр. https://x.onrender.com/mobile/")
    ap.add_argument("--version-code", type=int, default=1)
    ap.add_argument("--version-name", default="1.0.0")
    ap.add_argument("--out", default=str(BUILD / "dragonmania.apk"))
    ap.add_argument("--ks", default=str(BUILD / "dragonmania-release.jks"), help="keystore (создаётся при первом запуске)")
    ap.add_argument("--ks-pass", default=os.environ.get("DML_KS_PASS", "dragonmania"))
    args = ap.parse_args()

    if not args.server_url.startswith("https://"):
        sys.exit("--server-url должен начинаться с https:// (WebView и сервер работают по TLS)")

    tools = pathlib.Path(os.environ.get("DML_TOOLS", pathlib.Path.home() / "apkbuild-tools"))
    java = os.environ.get("JAVA", "java")
    apktool_jar = os.environ.get("APKTOOL_JAR", str(tools / "apktool.jar"))
    apksigner_jar = os.environ.get("APKSIGNER_JAR", str(tools / "apksigner.jar"))
    keytool = os.environ.get("KEYTOOL", "keytool")
    for p in (apktool_jar, apksigner_jar):
        if not os.path.exists(p):
            sys.exit(f"не найден инструмент: {p} (см. android/README.md)")

    BUILD.mkdir(parents=True, exist_ok=True)
    work = BUILD / "work"
    if work.exists():
        shutil.rmtree(work)
    work.mkdir(parents=True)

    # 1. smali -> classes.dex. apktool собирает dex из smali; ресурсы при этом не трогаем (-r):
    #    манифест и таблица ресурсов строятся ниже, поэтому стаб-манифест здесь не попадает в APK.
    smali_out = work / "smali"
    shutil.copytree(PROJECT / "smali", smali_out)
    activity = smali_out / "com/dragonmania/mobile/MainActivity.smali"
    activity.write_text(activity.read_text(encoding="utf-8").replace(PLACEHOLDER, args.server_url), encoding="utf-8")
    dex_dir = work / "dex"
    dex_dir.mkdir()
    (dex_dir / "AndroidManifest.xml").write_text(f'<manifest xmlns:android="{ANDROID_NS}" package="{PACKAGE}"/>\n', encoding="utf-8")
    (dex_dir / "apktool.yml").write_text("version: 2.9.3\napkFileName: dex.apk\nisFrameworkApk: false\n", encoding="utf-8")
    shutil.copytree(smali_out, dex_dir / "smali")
    dex_apk = work / "dex.apk"
    run([java, "-jar", apktool_jar, "b", "-r", "-f", str(dex_dir), "-o", str(dex_apk)])
    with zipfile.ZipFile(dex_apk) as z:
        dex = work / "classes.dex"
        dex.write_bytes(z.read("classes.dex"))

    # 2–3. бинарные манифест и таблица ресурсов
    manifest = build_manifest(21, 34, args.version_code, args.version_name)
    icon_src = PROJECT / "res" / "mipmap" / "ic_launcher.png"
    icon_in_apk = "res/mipmap/ic_launcher.png"
    arsc = build_resources_arsc(icon_in_apk)

    # 4. упаковка: resources.arsc без сжатия (требование Android)
    unsigned = work / "unsigned.apk"
    with zipfile.ZipFile(unsigned, "w") as z:
        z.writestr("AndroidManifest.xml", manifest, compress_type=zipfile.ZIP_DEFLATED)
        z.writestr("classes.dex", dex.read_bytes(), compress_type=zipfile.ZIP_DEFLATED)
        z.writestr("resources.arsc", arsc, compress_type=zipfile.ZIP_STORED)
        z.write(icon_src, icon_in_apk, compress_type=zipfile.ZIP_DEFLATED)

    # ключ (создаётся один раз; переиспользуется, чтобы обновления APK ставились поверх)
    ks = pathlib.Path(args.ks)
    if not ks.exists():
        run([keytool, "-genkeypair", "-keystore", str(ks), "-storetype", "PKCS12", "-storepass", args.ks_pass,
             "-alias", "dragonmania", "-keyalg", "RSA", "-keysize", "2048", "-validity", "10000",
             "-dname", "CN=Dragonmania, O=Dragonmania, C=BY"])

    out = pathlib.Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    run([java, "-jar", apksigner_jar, "sign", "--ks", str(ks), "--ks-key-alias", "dragonmania",
         "--ks-pass", f"pass:{args.ks_pass}", "--key-pass", f"pass:{args.ks_pass}",
         "--out", str(out), str(unsigned)])
    run([java, "-jar", apksigner_jar, "verify", "--verbose", str(out)])
    out.with_name(out.name + ".idsig").unlink(missing_ok=True)  # служебный файл apksigner
    shutil.rmtree(work, ignore_errors=True)
    print(f"\nГотово: {out} ({out.stat().st_size // 1024} КБ)")


if __name__ == "__main__":
    main()
