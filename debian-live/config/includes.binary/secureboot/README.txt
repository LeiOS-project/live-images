LeiOS and Secure Boot
=====================

LeiOS starts with the boot loader "shim", which Microsoft signed with its
UEFI CA for third-party software, like the boot loaders of Debian, Ubuntu and
Fedora. Some computers, often sold with Windows 11 ("Secured-core PC"), trust
only Microsoft's Windows certificate by default and refuse to start it, with
"Secure Boot Violation", "Security Violation" or a similar message.

You can fix this in one of these ways:

1. Easiest: in the firmware setup ("BIOS"), in the Secure Boot settings,
   enable the option to trust Microsoft's third-party certificate. Its name
   differs, for example "Allow Microsoft 3rd Party UEFI CA" or
   "Microsoft & 3rd party CA".

2. In the firmware setup, add the certificates in this folder to the Secure
   Boot signature database "db" yourself. Look for "Key Management", choose
   "db" and then "Append", "Add" or "Enroll certificate from file", and
   select the files on this USB stick:

     ms-uefi-ca-2023.cer   Microsoft UEFI CA 2023
     ms-uefi-ca-2011.cer   Microsoft Corporation UEFI CA 2011

   Add both: LeiOS' boot loader carries a signature for each, and some
   firmware only checks the older one. Some firmware only allows this in a
   "Custom" or "User" Secure Boot mode.

   Only ever add certificates. Never choose "Replace", "Delete" or "Reset to
   setup mode" for existing keys: that can stop Windows or the computer from
   starting.

3. If the firmware setup offers neither (for example on Acer computers,
   whose file browser only lists .efi files), let LeiOS add the certificate:
   turn Secure Boot off in the firmware setup (Acer: set a supervisor
   password first), start LeiOS from this USB stick, open a terminal
   (Konsole) and run

     sudo python3 /run/live/medium/secureboot/leios-secureboot.py --add

   It adds Microsoft UEFI CA 2023 to db with an update that Microsoft signed
   for this purpose, which computers sold with Windows accept. Then turn
   Secure Boot on again. Without --add, the command only shows the Secure
   Boot keys of the computer. Firmware that only checks the older of the two
   signatures still refuses LeiOS afterwards; Microsoft offers no such update
   for its older certificate.

If Windows on the computer uses BitLocker ("device encryption"), it asks for
the recovery key once after any of these changes: have it at hand
(https://aka.ms/myrecoverykey). "Restore factory keys" or similar in the
firmware setup undoes them.

The certificates (DER encoded X.509) and the signed update
DBUpdate3P2023.bin are Microsoft's own, as published at
https://github.com/microsoft/secureboot_objects (license in LICENSE.txt);
leios-secureboot.py is part of LeiOS. Neither comes from LeiOS' own keys or
gives anyone more access than option 1.
