# Auto Accent Colour
Automatically set the GNOME accent colour based on the user's background.

Works out of the box for most backgrounds, but ImageMagick must be installed to parse colour data from default GNOME backgrounds.

Note: GNOME Settings currently has an issue of it 'resetting' the accent colour when the Appearance page is open and the accent colour is changed externally.
To avoid this, navigate away from the Appearance page (or close the Settings window), and re-run the Auto Accent Colour script by clicking the 'Force Refresh' indicator option, disabling/re-enabling the extension, or locking and unlocking your device.

## Development
Get the source:
```
mkdir -p ~/.local/share/gnome-shell/extensions
cd !$
git clone https://github.com/Wartybix/GNOME-Auto-Accent-Colour auto-accent-colour@Wartybix
cd !$
```

Recompile schemas:
```
glib-compile-schemas ./schemas
```

Then, either restart or create a nested gnome shell; see [](https://gjs.guide/extensions/development/creating.html#testing-the-extension).
