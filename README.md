# LeiOS Live Images

LeiOS Live Images uses Debian's `live-build` tooling to assemble bootable ISO
and PXE images for LeiOS. This repository contains the configuration tree that
`live-build` consumes, along with helper scripts for the usual build workflow.

## Prerequisites

- Debian or Ubuntu based build host (recommended: Debian stable or testing)
- `sudo` access for installing dependencies and running `lb` commands
- Required packages:
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
sudo apt-get install live-build debootstrap squashfs-tools xorriso qemu-user-static binfmt-support
```

Register QEMU interpreters:
```bash
sudo update-binfmts --enable qemu-aarch64
sudo systemctl restart systemd-binfmt
```

## Quick Start

```bash
# Configure the build (only required the first time or after config changes)
sudo ./leios-live-build config

# Build the ISO image (run from the repository root)
sudo ./leios-live-build build
```

The resulting images appear under `live-image-*` directories at the repository
root. Use `sudo lb clean` to remove build artifacts, or run the helper scripts in
`auto/`:

- `auto/config` mirrors `lb config`
- `auto/build` wraps `lb build`
- `auto/clean` performs a full clean cycle

For reproducible builds, run `sudo lb clean --purge` to drop cached packages
before rebuilding.

## Repository Layout

- `config/`: Main live-build configuration tree
  - `binary/`, `bootstrap/`, `chroot/`, `common/`, `source/`: Stage specific
    configuration snippets consumed by `lb`
  - `bootloaders/`: Menu and binary assets for extlinux, isolinux, pxelinux, and
    syslinux targets
  - `hooks/`: Chroot hooks executed during image creation (package cache updates,
    cleanup tasks, etc.)
  - `package-lists/`: Package selections grouped by image profile
- `auto/`: Shell wrappers for repeatable configure/build/clean invocations

Generated `live-image-*` directories can be removed safely; re-run the build to
regenerate them.

## Customization

- Adjust package selections in `config/package-lists/` to add or remove software
- Modify boot menus under `config/bootloaders/*/`
- Update chroot behavior by editing scripts in `config/hooks/`
- Override lower-level defaults via snippets in `config/common/` or other stage
  directories

After changing configuration files, rerun `sudo lb config` before rebuilding.

## Troubleshooting

- Ensure `/tmp` and the working directory have several gigabytes of free space
- Clear stale artifacts with `sudo lb clean --purge` if builds fail unexpectedly
- Inspect `/var/log/live-build.log` inside the build tree for detailed errors

## Useful Links

- Live Systems project: <https://wiki.debian.org/DebianLive>
- live-build documentation: <https://live-team.pages.debian.net/live-manual/>
- live-build source: <https://salsa.debian.org/live-team/live-build>
