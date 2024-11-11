import GLib from 'gi://GLib'

function isImageMagickInstalled() {
    let lookup = GLib.find_program_in_path('magick')
    if (!lookup) {
        lookup = GLib.find_program_in_path('convert')
    }
    return lookup !== null
}

function getConvertCommand() {
    return GLib.find_program_in_path('magick') ? 'magick' : 'convert'
}

let loggingEnabled = false

function setLogging(value) {
    loggingEnabled = value
}

function journal(msg) {
    if (loggingEnabled) {
        console.log(`Auto Accent Colour: ${msg}`)
    }
}

export {
    isImageMagickInstalled,
    getConvertCommand,
    loggingEnabled,
    setLogging,
    journal
}
