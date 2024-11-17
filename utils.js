import GLib from 'gi://GLib'

function isCmdAvailable(cmd) {
    const lookup = GLib.find_program_in_path(cmd)
    return lookup !== null
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
    isCmdAvailable,
    loggingEnabled,
    setLogging,
    journal
}
