# LeiOS Live Images

LeiOS Live Images uses rootless `mmdebstrap` to assemble bootable ISO images for LeiOS. This repository contains the package lists, hooks, and overrides, along with a TypeScript/Bash CLI for the build workflow.

By using `mmdebstrap --mode=fakechroot`, this build system is fully compatible with unprivileged container executors (like sysbox-runc in GitLab CI) and **does not require root privileges or sys-admin kernel capabilities**.

## Prerequisites

- Debian or Ubuntu based build host.
- `bun` (JavaScript runtime) for the build CLI.
- Required packages:
  - `curl`
  - `unzip`
  - `mmdebstrap`
  - `fakechroot`
  - `fakeroot`
  - `squashfs-tools`
  - `xorriso`
  - `mtools`
  - `grub-pc-bin` (for amd64)
  - `grub-efi-amd64-bin` (for amd64)
  - `grub-efi-arm64-bin` (for arm64)
  - `qemu-user-static` (for arm64 emulation)

Install the core tooling on Debian based systems with:

```bash
sudo apt-get update
sudo apt-get install curl unzip mmdebstrap fakechroot fakeroot squashfs-tools xorriso mtools grub-pc-bin grub-efi-amd64-bin qemu-user-static
```

## Quick Start

You do not need `sudo` to build.

```bash
# Build the ISO image for amd64
./leios-live-build build-and-publish --architecture=amd64 --version=1.0.0
```

The resulting files (ISO, `.files`, `.packages`, etc.) will be placed in `tmp/build/`.

## Repository Layout

- `cli/`: TypeScript CLI wrapper (`leios-live-build`).
  - `cli/build-rootless.sh`: The core bash script executing `mmdebstrap` and `grub-mkrescue`.
- `debian-live/config/`: Configuration tree
  - `hooks/`: Shell scripts run inside the fakechroot during image creation.
  - `includes.chroot/`: Overlay files copied directly into the root filesystem.
  - `package-lists/`: Package selections grouped by `.list.chroot` files.

## Customization

- Adjust package selections in `debian-live/config/package-lists/` to add or remove software.
- Modify boot menus directly in `cli/build-rootless.sh` (GRUB configuration step).
- Update chroot behavior by editing scripts in `debian-live/config/hooks/`.
- Add override files (like `/etc/os-release`) in `debian-live/config/includes.chroot/`.

Variables like `{{INSERT_TARGET_ARCH}}` and `{{INSERT_TARGET_LIVE_VERSION}}` are automatically replaced in hooks and text files inside `includes.chroot`.
