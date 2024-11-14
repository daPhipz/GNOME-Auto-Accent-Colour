#!/bin/bash

# Script to refresh the translation files.
# Run it from the project root.

POTFILE="po/auto-accent-colour@Wartybix.pot"

# Check for new translatable strings
xgettext --msgid-bugs-address="34974060+Wartybix@users.noreply.github.com" \
         --from-code=UTF-8 \
         --add-comments="TRANSLATORS" \
         --output="$POTFILE" \
         ./*.js

# Refresh the po files if desired
read -p "Do you want to refresh the existing translations? [y|N] " -r response
if [[ "$response" == "y" || "$response" == "Y" ]]; then
    for file in po/*.po; do
        echo "Refreshing $file..."
        msgmerge --update \
                 "$file" "$POTFILE"
    done
else
    echo "The existing translations were not refreshed."
fi
