import St from 'gi://St'
import Gio from 'gi://Gio'
import * as Main from 'resource:///org/gnome/shell/ui/main.js'
import {Extension, gettext as _} from 'resource:///org/gnome/shell/extensions/extension.js'

const INTERFACE_SCHEMA = 'org.gnome.desktop.interface'
const BACKGROUND_SCHEMA = 'org.gnome.desktop.background'

// Thank you to andy.holmes on StackOverflow for this Promise wrapper
// https://stackoverflow.com/a/61150669
function execCommand(argv, input = null, cancellable = null) {
    let flags = Gio.SubprocessFlags.STDOUT_PIPE;

    if (input !== null)
        flags |= Gio.SubprocessFlags.STDIN_PIPE;

    let proc = new Gio.Subprocess({
        argv: argv,
        flags: flags
    });
    proc.init(cancellable);

    return new Promise((resolve, reject) => {
        proc.communicate_utf8_async(input, cancellable, (proc, res) => {
            try {
                resolve(proc.communicate_utf8_finish(res)[1]);
            } catch (e) {
                reject(e);
            }
        });
    });
}

async function getDominantColour(extensionPath) {
    try {
        const _backgroundSettings = new Gio.Settings({ schema: BACKGROUND_SCHEMA })
        const _backgroundUri = _backgroundSettings.get_string('picture-uri')
        const _backgroundLocation = _backgroundUri.replace('file://', '')

        const _wallpaperColour = await execCommand([
            extensionPath + '/venv/bin/python',
            extensionPath + '/tools/get-colour.py',
            _backgroundLocation
        ])

        console.log('Wallpaper colour: ' + _wallpaperColour)

        Main.notify("test", _wallpaperColour)
    } catch (e) {
        logError(e)
    }
}

export default class AutoAccentColourExtension extends Extension {
    enable() {
        getDominantColour(this.path)

        const _gsettings = new Gio.Settings({ schema: INTERFACE_SCHEMA });
        const _accent = _gsettings.get_string('accent-color')
    }

    disable() {

    }
}
