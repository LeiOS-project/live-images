#!/bin/bash
set -eo pipefail

export TARGET_ARCH="${INSERT_TARGET_ARCH:-amd64}"
export LIVE_VERSION="${INSERT_TARGET_LIVE_VERSION:-0.0.0}"
export CODENAME="${INSERT_BASE_CODENAME:-trixie}"
export DATE_TAG="${INSERT_TARGET_DATE:-$(date +%Y%m%d)}"

BUILD_DIR="$PWD"
ROOTFS_DIR="$BUILD_DIR/rootfs"
ISO_DIR="$BUILD_DIR/iso"
LIVE_DIR="$ISO_DIR/live"
BOOT_DIR="$ISO_DIR/boot/grub"

echo "=== LeiOS Rootless Build ==="
echo "Architecture: $TARGET_ARCH"
echo "Version: $LIVE_VERSION"
echo "Codename: $CODENAME"

# 1. Prepare directories
mkdir -p "$ROOTFS_DIR" "$LIVE_DIR" "$BOOT_DIR"

# 2. Gather packages
# We concatenate all .list.chroot files, strip comments, replace variables
PKGS=$(cat config/package-lists/*.list.chroot | grep -v '^#' | grep -v '^[[:space:]]*$' | sed -e "s/{{INSERT_TARGET_ARCH}}/$TARGET_ARCH/g" | tr '\n' ',' | sed 's/,$//')

# Append base essentials
PKGS="$PKGS,systemd-sysv,sudo,nano,linux-image-$TARGET_ARCH,live-boot,live-config"

echo "Packages to install: $PKGS"

# 3. Setup hooks and includes
HOOKS_OPTS=()

# Copy all hooks into a temporary directory so we can run them inside chroot
mkdir -p "$BUILD_DIR/tmp-hooks"
if [ -d "config/hooks" ]; then
    for hook in config/hooks/*.hook.chroot; do
        if [ -f "$hook" ]; then
            hook_name=$(basename "$hook")
            cp "$hook" "$BUILD_DIR/tmp-hooks/$hook_name"
            chmod +x "$BUILD_DIR/tmp-hooks/$hook_name"
            # Replace vars in the hook copy
            sed -i "s/{{INSERT_TARGET_ARCH}}/$TARGET_ARCH/g" "$BUILD_DIR/tmp-hooks/$hook_name"
            sed -i "s/{{INSERT_TARGET_LIVE_VERSION}}/$LIVE_VERSION/g" "$BUILD_DIR/tmp-hooks/$hook_name"
            
            # Add to mmdebstrap customize hooks
            HOOKS_OPTS+=("--customize-hook=copy-in $BUILD_DIR/tmp-hooks/$hook_name /tmp/$hook_name")
            HOOKS_OPTS+=("--customize-hook=chroot \"\$1\" /tmp/$hook_name")
            HOOKS_OPTS+=("--customize-hook=rm \"\$1/tmp/$hook_name\"")
        fi
    done
fi

# Process includes.chroot variables
if [ -d "config/includes.chroot" ]; then
    mkdir -p "$BUILD_DIR/tmp-includes"
    cp -r config/includes.chroot/* "$BUILD_DIR/tmp-includes/" 2>/dev/null || true
    
    # Replace variables in text files
    find "$BUILD_DIR/tmp-includes" -type f -exec grep -Iq . {} \; -exec sed -i "s/{{INSERT_TARGET_ARCH}}/$TARGET_ARCH/g" {} \;
    find "$BUILD_DIR/tmp-includes" -type f -exec grep -Iq . {} \; -exec sed -i "s/{{INSERT_TARGET_LIVE_VERSION}}/$LIVE_VERSION/g" {} \;
    
    HOOKS_OPTS+=("--customize-hook=sync-in $BUILD_DIR/tmp-includes /")
fi

# 4. Bootstrap the system
echo "Starting mmdebstrap..."

# use unshare mode. sysbox supports user namespaces nicely.
# We also disable doc installation to save space.
mmdebstrap \
    --mode=fakechroot \
    --variant=apt \
    --include="$PKGS" \
    --dpkgopt="path-exclude=/usr/share/doc/*" \
    --dpkgopt="path-exclude=/usr/share/man/*" \
    "${HOOKS_OPTS[@]}" \
    "$CODENAME" \
    "$ROOTFS_DIR" \
    "http://deb.debian.org/debian"

# 5. Extract kernel and initrd
echo "Extracting kernel..."
cp "$ROOTFS_DIR"/boot/vmlinuz-* "$LIVE_DIR/vmlinuz"
cp "$ROOTFS_DIR"/boot/initrd.img-* "$LIVE_DIR/initrd.img"

# 6. Create SquashFS
echo "Compressing filesystem..."
fakeroot mksquashfs "$ROOTFS_DIR" "$LIVE_DIR/filesystem.squashfs" \
    -comp zstd -b 1M -noappend -e boot

# 7. Bootloader configuration
echo "Configuring bootloader..."
cat << EOF > "$BOOT_DIR/grub.cfg"
search --set=root --file /live/vmlinuz

set default="0"
set timeout=5

menuentry "LeiOS Live ($TARGET_ARCH)" {
    linux /live/vmlinuz boot=live components quiet splash username=user hostname=leios
    initrd /live/initrd.img
}
EOF

# 8. Create info files matching live-build
echo "Generating info files..."
dpkg-query -W --admindir="$ROOTFS_DIR/var/lib/dpkg" > "leios-live-$LIVE_VERSION-$TARGET_ARCH.packages" || true
find "$ROOTFS_DIR" -printf "%P\n" > "leios-live-$LIVE_VERSION-$TARGET_ARCH.files" || true
touch "leios-live-$LIVE_VERSION-$TARGET_ARCH.contents"

# 9. Create the final ISO
echo "Creating ISO..."

# Different architectures need different grub packages installed in the CI container
if [ "$TARGET_ARCH" = "amd64" ]; then
    grub-mkrescue -o "leios-live-$LIVE_VERSION-$TARGET_ARCH.hybrid.iso" "$ISO_DIR" -volid "LeiOS-$TARGET_ARCH"
elif [ "$TARGET_ARCH" = "arm64" ]; then
    grub-mkrescue -o "leios-live-$LIVE_VERSION-$TARGET_ARCH.hybrid.iso" "$ISO_DIR" -volid "LeiOS-$TARGET_ARCH" -- -e boot/grub/efi.img -no-emul-boot
fi

echo "Build successfully finished."
