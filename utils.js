import GLib from 'gi://GLib'

function isImageMagickInstalled() {
	const lookup = GLib.find_program_in_path('magick')
	console.log(`Magick lookup: ${lookup}`)
	return lookup != null
}

export default isImageMagickInstalled()
