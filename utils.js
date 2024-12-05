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
    loggingEnabled,
    setLogging,
    journal
}
