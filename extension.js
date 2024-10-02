// TODO: Experiment with ColorThief palettes
// TODO: Preferences window to allow user to pick which palette entry to use (e.g overall or highlight)
// TODO: Reorganise functions
// TODO: Refactor variable names
// TODO: Run script on background and color-scheme change
// TODO: Add Extensions store page support
// TODO: Add checker/installer for Python venv

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
    constructor(name, r, g, b) {
        this.name = name,
        this.r = r
        this.g = g
        this.b = b
    }
}

const accentColours = [
    new AccentColour("blue", 53, 131, 227), // Blue
    new AccentColour("teal", 33, 144, 164), // Teal
    new AccentColour("green", 58, 148, 74), // Green
    new AccentColour("yellow", 200, 136, 0), // Yellow
    new AccentColour("orange", 237, 91, 0), // Orange
    new AccentColour("red", 230, 45, 66), // Red
    new AccentColour("pink", 213, 97, 153), // Pink
    new AccentColour("purple", 145, 65, 172), // Purple
    new AccentColour("slate", 111, 131, 150) // Slate
]

function getSquaredEuclideanDistance(r1, g1, b1, r2, g2, b2) {
    return (r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2
}

function getClosestAccentColour(r, g, b) {
    let _shortestDistance = Number.MAX_VALUE
    let _closestAccent = ''

    for (let accent of accentColours) {
        let _squaredEuclideanDistance = getSquaredEuclideanDistance(r, g, b,
            accent.r, accent.g, accent.b)

        if (_squaredEuclideanDistance < _shortestDistance) {
            _shortestDistance = _squaredEuclideanDistance
            _closestAccent = accent.name
        }
    }

    console.log("Closest accent: " + _closestAccent)

    return _closestAccent
}

// TODO: check for existance of imagemagick
async function convert(imagePath, extensionPath) {
    const _cacheDir = extensionPath + '/cached/'
    await execCommand(['mkdir', _cacheDir])
    await execCommand(['magick', imagePath, _cacheDir + '/converted_bg.jpg'])
}

// TODO: Hoist settings variables
async function getDominantColour(extensionPath) {
    try {
        const _backgroundSettings = new Gio.Settings({ schema: BACKGROUND_SCHEMA })
        const _interfaceSettings = new Gio.Settings({ schema: INTERFACE_SCHEMA })

        const _colorScheme = _interfaceSettings.get_string('color-scheme')
        const _backgroundUriKey = (
            _colorScheme == 'prefer-dark' ? 'picture-uri-dark' : 'picture-uri'
        )
        const _backgroundUri = _backgroundSettings.get_string(_backgroundUriKey)
        const _backgroundPath = _backgroundUri.replace('file://', '')
        const _backgroundFileExtension = _backgroundPath.split('.').pop()
        let _rasterPath = ''

        if (['svg', 'jxl'].includes(_backgroundFileExtension)) {
            await convert(_backgroundPath, extensionPath)
            _rasterPath = extensionPath + '/cached/converted_bg.jpg'
        } else {
            _rasterPath = _backgroundPath
        }

        const _wallpaperColourStr = await execCommand([
            extensionPath + '/venv/bin/python',
            extensionPath + '/tools/get-colour.py',
            _rasterPath
        ])
        console.log('Wallpaper colour: ' + _wallpaperColourStr)


        const _wallpaperColourTuple = _wallpaperColourStr
            .replace(/\(|\)|\n/g, '')
            .split(',')
        for (let i in _wallpaperColourTuple) {
            _wallpaperColourTuple[i] = Number(_wallpaperColourTuple[i])
        }
        console.log('Parsed R: ' + _wallpaperColourTuple[0])
        console.log('Parsed G: ' + _wallpaperColourTuple[1])
        console.log('Parsed B: ' + _wallpaperColourTuple[2])

        return _wallpaperColourTuple
    } catch (e) {
        logError(e)
    }
}

async function applyClosestAccent(extensionPath) {
    const [wall_r, wall_g, wall_b] = await getDominantColour(extensionPath)
    const closestAccent = getClosestAccentColour(wall_r, wall_g, wall_b)

    const _interfaceSettings = new Gio.Settings({ schema: INTERFACE_SCHEMA });
    _interfaceSettings.set_string('accent-color', closestAccent)
}

export default class AutoAccentColourExtension extends Extension {
    enable() {
        applyClosestAccent(this.path)
    }

    disable() {

    }
}
