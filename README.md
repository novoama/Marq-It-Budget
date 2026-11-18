# Marq-It Budget

A private budget app. Everything personal is in `app.enc` and `project.enc`, which are locked: AES-256-GCM with a key from PBKDF2-SHA256 over the owner's passcode. Nothing here can be read without it.
