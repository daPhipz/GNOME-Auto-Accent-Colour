import St from 'gi://St'
import Gio from 'gi://Gio'
import * as Main from 'resource:///org/gnome/shell/ui/main.js'
import {Extension, gettext as _} from 'resource:///org/gnome/shell/extensions/extension.js'

const INTERFACE_SCHEMA = 'org.gnome.desktop.interface'
const BACKGROUND_SCHEMA = 'org.gnome.desktop.background'

async function getDominantColour(extensionPath) {
    try {
        const _backgroundSettings = new Gio.Settings({ schema: BACKGROUND_SCHEMA })
        const _backgroundUri = _backgroundSettings.get_string('picture-uri')

        const proc = Gio.Subprocess.new(
            [
                extensionPath + '/venv/bin/python',
                extensionPath + '/tools/get-color.py',
                _backgroundUri
            ],
            Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE
        )

        const [stdout, stderr] = await proc.communicate_utf8_async(null, null)
        // THE ABOVE LINE IS CAUSING PROBLEMS

        Main.notify("test", "got here")

        if (proc.get_successful())
            Main.notify('Overall colour', stdout)
        else
            throw new Error(stderr)
    } catch (e) {
        logError(e)
    }
}

export default class AutoAccentColourExtension extends Extension {
    enable() {
        getDominantColour(this.path)

        const _gsettings = new Gio.Settings({ schema: INTERFACE_SCHEMA });
        const _accent = _gsettings.get_string('accent-color')

        //Main.notify('Accent Color', _accent)

        _gsettings.set_string('accent-color', 'pink')
    }

    disable() {

    }
}
