#!/bin/sh

EXTENSIONS_DIR="/home/$USER/.local/share/gnome-shell/extensions"
AAC_DIR="$EXTENSIONS_DIR/auto-accent-colour@Wartybix"
ZIP_FILE="auto-accent-colour@Wartybix.shell-extension.zip"

sh pack.sh

rm -rf $AAC_DIR
mkdir -p $EXTENSIONS_DIR
unzip -q $ZIP_FILE -d $AAC_DIR
rm $ZIP_FILE

glib-compile-schemas $AAC_DIR/schemas
