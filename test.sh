EXTENSION_DIR="/home/$USER/.local/share/gnome-shell/extensions/auto-accent-colour@Wartybix"

rm -rf $EXTENSION_DIR
cp -r . $EXTENSION_DIR
glib-compile-schemas $EXTENSION_DIR/schemas

dbus-run-session -- gnome-shell --nested --wayland
