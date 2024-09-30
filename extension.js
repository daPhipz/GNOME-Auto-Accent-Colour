import St from 'gi://St'
import * as Main from 'resource:///org/gnome/shell/ui/main.js'
import {Extension, gettext as _} from 'resource:///org/gnome/shell/extensions/extension.js'

export default class AutoAccentColourExtension extends Extension {
    enable() {
        let gsettings = new Gio.Settings('org.gnome.desktop.interface');
        let accent = gsettings.get_string('accent-color')

        Main.notify(accent)
    }

    disable() {

    }
}
