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

class AccentColour {
    constructor(r, g, b) {
        this.r = r
        this.g = g
        this.b = b
    }
}

const accentColours = [
    new AccentColour(53, 131, 227), // Blue
    new AccentColour(33, 144, 164), // Teal
    new AccentColour(58, 148, 74), // Green
    new AccentColour(200, 136, 0), // Yellow
    new AccentColour(237, 91, 0), // Orange
    new AccentColour(230, 45, 66), // Red
    new AccentColour(213, 97, 153), // Pink
    new AccentColour(145, 65, 172), // Purple
    new AccentColour(111, 131, 150) // Slate
]

function getSquaredEuclideanDistance(r1, g1, b1, r2, g2, b2) {
    return (r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2
}

function getClosestAccentColour(r, g, b) {
    let _shortestDistance = Number.MAX_VALUE
    let _closestAccent = new AccentColour(0, 0, 0)

    for (accent of accentColours) {
        let _squaredEuclideanDistance = getSquaredEuclideanDistance(r, g, b,
            accent.r, accent.g, accent.b)

        if (_squaredEuclideanDistance < _shortestDistance) {
            _shortestDistance = _squaredEuclideanDistance
            _closestAccent = accent
        }
    }

    console.log("Closest accent colour: ")
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
