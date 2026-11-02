# LeiOS Live Images

LeiOS Live Images uses Debian's `live-build` tooling to assemble bootable ISO
and PXE images for LeiOS. This repository contains the configuration tree that
`live-build` consumes, along with helper scripts for the usual build workflow.

## Prerequisites

- Debian or Ubuntu based build host (recommended: Debian stable or testing)
- `sudo` access for installing dependencies and running `lb` commands
- Required packages:
  - `sudo`
  - `curl`
  - `unzip`
  - `live-build`
  - `debootstrap`
  - `squashfs-tools`
  - `xorriso`
  - `qemu-user-static`
  - `binfmt-support`
  - `bun`

Install the core tooling on Debian based systems with:

```bash
sudo apt-get update
sudo apt-get install sudo curl unzip live-build debootstrap squashfs-tools xorriso qemu-user-static binfmt-support
```

Register QEMU interpreters:
```bash
sudo update-binfmts --enable qemu-aarch64
sudo systemctl restart systemd-binfmt
```

## Quick Start

```bash
# Build the amd64 ISO (run from the repository root)
./leios-live-build build --version=1.0.0-$(date +%Y%m%d) --architecture=amd64

# Build a test ISO with the LeiOS packages from the testing repository
./leios-live-build build --version=1.0.0-$(date +%Y%m%d) --architecture=amd64 --suite=testing

# Remove the build directory again
./leios-live-build clean
```

The build runs in `tmp/build` (a copy of `debian-live/`), and the ISO ends up
there as `leios-live-<version>-<architecture>.hybrid.iso`. `--suite` (default
`stable`) selects the LeiOS repository suite the image installs from and that
installed systems use. In CI, set the pipeline variables
`LIVE_INSTALLER_VERSION` and `LEIOS_SUITE`. Once the amd64 image is published,
CI triggers the pipeline of `LeiOS/Website` on `main`, which rebuilds the
website so its download page offers the new image.

## Repository Layout

- `cli/`: The `leios-live-build` commands (config, build, publish, clean)
- `debian-live/auto/`: `config` fills the `{{INSERT_*}}` placeholders in the
  configuration and runs `lb config`; `build` and `clean` wrap `lb`
- `debian-live/config/`: The live-build configuration
  - `archives/`: Extra apt repositories (LeiOS, Mozilla) used during the build
  - `bootloaders/`: The live boot menu (GRUB, with the LeiOS GRUB theme)
  - `hooks/`: Chroot hooks executed during image creation
  - `includes.chroot/`: Files copied into the image: apt sources, the
    Flathub remote and Discover defaults, the Calamares installer
    configuration and branding, and the installer launcher (live session only)
  - `package-lists/`: The packages of the image: `base` (system, desktop,
    firmware, tools), `discover` (Discover with Flatpak and Snap), `leios`
    (LeiOS packages: `leios.theme.aio` brings all themes), `installer`,
    `live` and per-architecture lists

## The Installer

The image starts a KDE Plasma live session with the LeiOS look and an
"Install LeiOS" icon on the desktop, which runs Calamares
(`/usr/libexec/leios-live/install-leios`). Calamares copies the live system to
the disk, sets up GRUB (EFI with Secure Boot, or BIOS), removes the live and
installer packages and, with `shellprocess@leios-live-cleanup`, the
installer's files that are not part of any package. The installer also offers
the `en_DE.UTF-8` locale of `leios.system.locales.en-de`.

Generated `live-image-*` directories can be removed safely; re-run the build to
regenerate them.

### Secure Boot

The image boots with Debian's shim (signed by Microsoft's third-party UEFI CA,
2011 and 2023), Debian's signed GRUB and Debian's signed kernel, and installed
systems use the same chain. Firmware that only trusts Microsoft's Windows CA
("Secured-core" PCs) rejects it, like every Linux distribution: enable
"Allow Microsoft 3rd Party UEFI CA" (or similar) in the firmware settings, or
turn Secure Boot off.

Debian's signed GRUB always reads `/EFI/debian/grub.cfg` on the EFI system
partition, while GRUB for LeiOS lives in `/EFI/leios`: that is where
`grub-install` puts it, also on every GRUB update, as `GRUB_DISTRIBUTOR` is
LeiOS. So after installing GRUB, `shellprocess@leios-efi-boot`
(`/usr/libexec/leios-live/setup-efi-boot`) writes an `/EFI/debian/grub.cfg`
that loads LeiOS' configuration, unless that file belongs to another system
that is still installed. The `grub-install` wrapper Calamares calls also
installs shim and GRUB to the removable media path `/EFI/BOOT`, and Debian's
grub packages keep that copy up to date (`grub2/force_efi_extra_removable`).

### Dual boot detection

Debian's GRUB only lists other operating systems (found by `os-prober`) with
`GRUB_DISABLE_OS_PROBER=false`. The installer asks on its "Dual Boot" page
(`packagechooser@leios-dualboot`, after the partitioning page) whether to turn
that on; "Enable dual boot detection" is preselected. The choice is stored in
GlobalStorage as `packagechooser_leios-dualboot`, and
`contextualprocess@leios-dualboot` runs `/usr/libexec/leios-live/setup-os-prober`
in the installed system before GRUB is set up. It writes the setting to
`/etc/default/grub.d/90-leios-os-prober.cfg`, where it can be changed later.
The page's pictures (`dualboot-*.png` in the branding directory) are
screenshots of the LeiOS boot menu with and without Windows.

### BIOS systems

The image has `grub-efi-amd64`, which only reinstalls GRUB on updates on EFI
systems. On BIOS systems, `shellprocess@leios-bios-boot`
(`/usr/libexec/leios-live/setup-bios-boot`) replaces it with `grub-pc` before
GRUB is installed; the image carries that package as a file (hook
`9300-include-grub-pc-for-bios-installs.hook.chroot`), as it conflicts with
`grub-efi-amd64`. The `grub-install` wrapper then records the boot disk in
`grub-pc/install_devices` (by `/dev/disk/by-id`, like the Debian installer),
so GRUB updates also reach the disk's boot sector.

## Apps: Discover, Flatpak and Snap

Discover (`package-lists/discover.list.chroot`) installs apps from three
sources: Debian and LeiOS packages (PackageKit), Flatpak and Snap.

- **Flathub** is a system-wide Flatpak remote from the first start, in the live
  session and on installed systems. Hook `9200-add-flathub-remote.hook.chroot`
  adds it from `includes.chroot/etc/flatpak/remotes.d/flathub.flatpakrepo`
  (Flathub's own file, with its signing key). Flatpak would also add that file
  on its own on first use, as a preconfigured remote.
- **Snap**: `snapd` and Discover's Snap backend; snaps come from the Snap Store.
  As `snapd` is part of the image, every session has `/snap/bin` in `PATH`
  and the snap apps' desktop files in `XDG_DATA_DIRS` (snapd's
  `environment.d` and `profile.d` files), so installed snaps appear in the
  menu right away.
- **Default source**: for apps that exist in several sources, Discover
  preselects the Flatpak version (`includes.chroot/etc/xdg/discoverrc`). Users
  can pick another default in Discover's settings.
- `kde-config-flatpak` adds a page for Flatpak app permissions to System
  Settings.

## Customization

- Adjust package selections in `debian-live/config/package-lists/`
- Modify the boot menu under `debian-live/config/bootloaders/`
- Update chroot behavior by editing scripts in `debian-live/config/hooks/`
- Change the installer in `debian-live/config/includes.chroot/etc/calamares/`

## Troubleshooting

- Ensure `/tmp` and the working directory have several gigabytes of free space
- Clear stale artifacts with `sudo lb clean --purge` if builds fail unexpectedly
- Inspect `tmp/build/build.log` for detailed errors

## Useful Links

- Live Systems project: <https://wiki.debian.org/DebianLive>
- live-build documentation: <https://live-team.pages.debian.net/live-manual/>
- live-build source: <https://salsa.debian.org/live-team/live-build>
