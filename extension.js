import St from 'gi://St'
import Gio from 'gi://Gio'
import * as Main from 'resource:///org/gnome/shell/ui/main.js'
import {Extension, gettext as _} from 'resource:///org/gnome/shell/extensions/extension.js'

const INTERFACE_SCHEMA = 'org.gnome.desktop.interface'

export default class AutoAccentColourExtension extends Extension {
    enable() {
        const _gsettings = new Gio.Settings({ schema: INTERFACE_SCHEMA });
        const _accent = _gsettings.get_string('accent-color')

        Main.notify('Accent Color', _accent)

        _gsettings.set_string('accent-color', 'pink')
    }

    disable() {

    }
}
