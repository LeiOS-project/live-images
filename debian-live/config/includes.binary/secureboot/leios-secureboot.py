#!/usr/bin/python3
"""Show the Secure Boot keys of this computer, and add Microsoft UEFI CA 2023.

Run it in the LeiOS live system, started with Secure Boot turned off:

    sudo python3 /run/live/medium/secureboot/leios-secureboot.py
    sudo python3 /run/live/medium/secureboot/leios-secureboot.py --add

Without options it only shows the keys. With --add it appends Microsoft UEFI
CA 2023, which LeiOS' boot loader is signed with, to the signature database
db, using Microsoft's own signed update (DBUpdate3P2023.bin, from
https://github.com/microsoft/secureboot_objects): the firmware only accepts
it because Microsoft signed it with its key exchange key, which is in every
computer sold with Windows. This is the update Windows applies on computers
that already trust Microsoft's third-party CA 2011.
"""
import glob
import hashlib
import os
import struct
import subprocess
import sys
import uuid

EFIVARS = "/sys/firmware/efi/efivars"
GLOBAL = "8be4df61-93ca-11d2-aa0d-00e098032b8c"
IMAGE_SECURITY = "d719b2cb-3d3a-4596-a3bc-dad00e67656f"
SHIM_LOCK = "605dab50-e046-4300-abb6-3dd810dd8b23"
CERT_X509 = uuid.UUID("a5c059a1-94e4-4aa7-87b5-ab155c2bf072")
CERT_SHA256 = uuid.UUID("c1c41626-504c-4092-aca9-41f936934328")
HERE = os.path.dirname(os.path.abspath(__file__))
# EFI_VARIABLE_NON_VOLATILE | BOOTSERVICE_ACCESS | RUNTIME_ACCESS |
# TIME_BASED_AUTHENTICATED_WRITE_ACCESS | APPEND_WRITE
APPEND_ATTRIBUTES = 0x67


def variable(name, guid):
    try:
        with open(f"{EFIVARS}/{name}-{guid}", "rb") as f:
            return f.read()[4:]
    except FileNotFoundError:
        return None


def signatures(esls):
    """(type, data) of each entry of a list of EFI_SIGNATURE_LISTs."""
    off = 0
    while esls and off + 28 <= len(esls):
        kind = uuid.UUID(bytes_le=esls[off:off + 16])
        list_size, header_size, size = struct.unpack_from("<III", esls, off + 16)
        if list_size < 28 or size < 16:
            break
        pos = off + 28 + header_size
        while pos + size <= off + list_size:
            yield kind, esls[pos + 16:pos + size]
            pos += size
        off += list_size


def name_of(der):
    out = subprocess.run(["openssl", "x509", "-inform", "DER", "-noout", "-subject",
                          "-nameopt", "RFC2253"], input=der, capture_output=True)
    for part in out.stdout.decode(errors="replace").strip().split(","):
        if part.startswith(("subject=CN=", "CN=")):
            return part.split("CN=", 1)[1]
    return "certificate " + hashlib.sha256(der).hexdigest()[:16]


def authenticode_sha256(image):
    """The hash Secure Boot compares with hash entries in db and dbx."""
    pe = struct.unpack_from("<I", image, 0x3C)[0]
    optional = pe + 24
    magic, = struct.unpack_from("<H", image, optional)
    checksum = optional + 64
    security = optional + (96 if magic == 0x10B else 112) + 4 * 8
    headers, = struct.unpack_from("<I", image, optional + 60)
    cert_size, = struct.unpack_from("<I", image, security + 4)
    h = hashlib.sha256()
    h.update(image[:checksum])
    h.update(image[checksum + 4:security])
    h.update(image[security + 8:headers])
    count, = struct.unpack_from("<H", image, pe + 6)
    optional_size, = struct.unpack_from("<H", image, pe + 20)
    table = optional + optional_size
    sections = sorted(struct.unpack_from("<II", image, table + 40 * i + 16)[::-1]
                      for i in range(count))
    hashed = headers
    for pointer, size in sections:
        if size:
            h.update(image[pointer:pointer + size])
            hashed += size
    h.update(image[hashed:len(image) - cert_size])
    return h.digest()


def boot_loader():
    for path in glob.glob("/run/live/medium/[Ee][Ff][Ii]/[Bb][Oo][Oo][Tt]/[Bb][Oo][Oo][Tt][Xx]64.[Ee][Ff][Ii]"):
        with open(path, "rb") as f:
            return path, authenticode_sha256(f.read())
    return None, None


def show():
    secure_boot = variable("SecureBoot", GLOBAL)
    setup_mode = variable("SetupMode", GLOBAL)
    print("Secure Boot:", "on" if secure_boot == b"\x01" else "off",
          "| setup mode:", "yes" if setup_mode == b"\x01" else "no")
    shim_path, shim_hash = boot_loader()
    for name, guid in (("PK", GLOBAL), ("KEK", GLOBAL), ("db", IMAGE_SECURITY),
                       ("dbx", IMAGE_SECURITY)):
        entries = list(signatures(variable(name, guid)))
        certs = [name_of(data) for kind, data in entries if kind == CERT_X509]
        hashes = [data for kind, data in entries if kind == CERT_SHA256]
        others = len(entries) - len(certs) - len(hashes)
        if name == "dbx":
            print(f"dbx: {len(certs)} certificates, {len(hashes)} hashes")
        else:
            print(f"{name}: " + ("; ".join(certs) or "no certificates")
                  + f" (+{len(hashes)} hashes" + (f", {others} other" if others else "") + ")")
        if shim_hash and name in ("db", "dbx"):
            print(f"  LeiOS boot loader's hash in {name}:",
                  "YES" if shim_hash in hashes else "no")
    sbat = variable("SbatLevelRT", SHIM_LOCK)
    if sbat is not None:
        print("SBAT level:", " ".join(sbat.decode(errors="replace").split()))
    if shim_path:
        print("Boot loader:", shim_path, shim_hash.hex()[:16])


def add():
    if os.geteuid() != 0:
        sys.exit("Please run this with sudo.")
    with open(os.path.join(HERE, "ms-uefi-ca-2023.cer"), "rb") as f:
        ca = f.read()
    with open(os.path.join(HERE, "DBUpdate3P2023.bin"), "rb") as f:
        update = f.read()
    if (CERT_X509, ca) in signatures(variable("db", IMAGE_SECURITY)):
        print("db already contains Microsoft UEFI CA 2023.")
        return
    print("""
This adds Microsoft UEFI CA 2023 to this computer's Secure Boot database db.
If Windows on this computer uses BitLocker (or "device encryption"), Windows
will ask for the BitLocker recovery key once after this change: have it at
hand (https://aka.ms/myrecoverykey) or suspend BitLocker in Windows first.
"Restore Secure Boot to factory defaults" in the firmware setup undoes it.
""")
    if input("Type yes to continue: ").strip().lower() != "yes":
        sys.exit("Nothing changed.")
    path = f"{EFIVARS}/db-{IMAGE_SECURITY}"
    subprocess.run(["chattr", "-i", path], check=False)
    fd = os.open(path, os.O_WRONLY)
    try:
        # efivarfs needs the attributes and the whole update in one write.
        os.write(fd, struct.pack("<I", APPEND_ATTRIBUTES) + update)
    except OSError as e:
        sys.exit(f"The firmware refused the update ({e.strerror}). Nothing changed.")
    finally:
        os.close(fd)
    if (CERT_X509, ca) in signatures(variable("db", IMAGE_SECURITY)):
        print("Done: db now contains Microsoft UEFI CA 2023. Turn Secure Boot on again.")
    else:
        sys.exit("The firmware accepted the update, but db doesn't show the certificate.")


if __name__ == "__main__":
    if not os.path.isdir(EFIVARS):
        sys.exit("This computer was not started in UEFI mode.")
    if sys.argv[1:] == ["--add"]:
        add()
        print()
    elif sys.argv[1:]:
        sys.exit(__doc__)
    show()
