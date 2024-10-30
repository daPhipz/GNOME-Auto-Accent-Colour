import GLib from 'gi://GLib'

function isImageMagickInstalled() {
	const lookup = GLib.find_program_in_path('magick')
	return lookup != null
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

export { isImageMagickInstalled, loggingEnabled, setLogging, journal }
