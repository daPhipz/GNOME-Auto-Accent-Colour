import GLib from 'gi://GLib'

function isImageMagickInstalled() {
	const lookup = GLib.find_program_in_path('magick')
	return lookup != null
}

export default isImageMagickInstalled
