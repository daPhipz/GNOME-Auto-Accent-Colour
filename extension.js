// TODO: Experiment with ColorThief palettes
// TODO: Preferences window to allow user to pick which palette entry to use (e.g overall or highlight)
// TODO: Add Extensions store page support
// TODO: Add checker/installer for Python venv
// TODO: Add some kind of fullscreen mode checker to prevent performance loss?
// TODO: Optimise ColorThief (shrink images before parsing them?)
// TODO: Cache wallpaper hashes and associated colours to reduce need to run ColorThief

import St from 'gi://St'
import Gio from 'gi://Gio'
import * as Main from 'resource:///org/gnome/shell/ui/main.js'
import {Extension, gettext as _} from
	'resource:///org/gnome/shell/extensions/extension.js'
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js'

const INTERFACE_SCHEMA = 'org.gnome.desktop.interface'
const COLOR_SCHEME = 'color-scheme'
const PREFER_DARK = 'prefer-dark'
const ACCENT_COLOR = 'accent-color'
const BLUE = 'blue'
const TEAL = 'teal'
const GREEN = 'green'
const YELLOW = 'yellow'
const ORANGE = 'orange'
const RED = 'red'
const PINK = 'pink'
const PURPLE = 'purple'
const SLATE = 'slate'
const BACKGROUND_SCHEMA = 'org.gnome.desktop.background'
const PICTURE_URI = 'picture-uri'
const PICTURE_URI_DARK = 'picture-uri-dark'

class AccentColour {
	constructor(name, r, g, b) {
		this.name = name,
		this.r = r
		this.g = g
		this.b = b
	}
}

const accentColours = [
	new AccentColour(BLUE, 53, 131, 227),
	new AccentColour(TEAL, 33, 144, 164),
	new AccentColour(GREEN, 58, 148, 74),
	new AccentColour(YELLOW, 200, 136, 0),
	new AccentColour(ORANGE, 237, 91, 0),
	new AccentColour(RED, 230, 45, 66),
	new AccentColour(PINK, 213, 97, 153),
	new AccentColour(PURPLE, 145, 65, 172),
	new AccentColour(SLATE, 111, 131, 150)
]

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

function getSquaredEuclideanDistance(r1, g1, b1, r2, g2, b2) {
	return (r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2
}

function getClosestAccentColour(r, g, b) {
	let shortestDistance = Number.MAX_VALUE
	let closestAccent = ''

	for (let accent of accentColours) {
		let squaredEuclideanDistance = getSquaredEuclideanDistance(
			r, g, b,
			accent.r, accent.g, accent.b
		)

		if (squaredEuclideanDistance < shortestDistance) {
			shortestDistance = squaredEuclideanDistance
			closestAccent = accent.name
		}
	}

	console.log("Closest accent: " + closestAccent)

	return closestAccent
}

// TODO: check for existance of imagemagick
async function convert(imagePath, extensionPath) {
	try {
		const cacheDir = extensionPath + '/cached/'
		await execCommand(['mkdir', cacheDir])
		await execCommand(['magick', imagePath, cacheDir + '/converted_bg.jpg'])
	} catch (e) {
		logError(e)
	}
}

async function getDominantColour(extensionPath, backgroundPath) {
	try {
		const backgroundFileExtension = backgroundPath.split('.').pop()
		let rasterPath = ''

		if (['svg', 'jxl'].includes(backgroundFileExtension)) {
			await convert(backgroundPath, extensionPath)
			rasterPath = extensionPath + '/cached/converted_bg.jpg'
		} else {
			rasterPath = backgroundPath
		}

		const wallpaperColourStr = await execCommand([
			extensionPath + '/venv/bin/python',
			extensionPath + '/tools/get-colour.py',
			rasterPath
		])
		console.log('Wallpaper colour: ' + wallpaperColourStr)


		const wallpaperColourTuple = wallpaperColourStr
			.replace(/\(|\)|\n/g, '')
			.split(',')
		for (let i in wallpaperColourTuple) {
			wallpaperColourTuple[i] = Number(wallpaperColourTuple[i])
		}
		console.log('Parsed R: ' + wallpaperColourTuple[0])
		console.log('Parsed G: ' + wallpaperColourTuple[1])
		console.log('Parsed B: ' + wallpaperColourTuple[2])

		return wallpaperColourTuple
	} catch (e) {
		logError(e)
	}
}

async function applyClosestAccent(
	extensionPath,
	backgroundPath,
	onFinish
) {
	const [wall_r, wall_g, wall_b] = await getDominantColour(
		extensionPath,
		backgroundPath
	)
	const closestAccent = getClosestAccentColour(wall_r, wall_g, wall_b)

	onFinish(closestAccent)
}

export default class AutoAccentColourExtension extends Extension {
	enable() {
		const extensionPath = this.path
		const iconsPath = extensionPath + '/icons/'

		this._backgroundSettings = new Gio.Settings({
			schema: BACKGROUND_SCHEMA
		})
		const backgroundSettings = this._backgroundSettings
		function getBackgroundUri() {
			return backgroundSettings.get_string(PICTURE_URI)
		}
		function getDarkBackgroundUri() {
			return backgroundSettings.get_string(PICTURE_URI_DARK)
		}

		this._interfaceSettings = new Gio.Settings({ schema: INTERFACE_SCHEMA })
		const interfaceSettings = this._interfaceSettings
		function getColorScheme() {
			return interfaceSettings.get_string(COLOR_SCHEME)
		}
		function setAccentColor(colorName) {
			interfaceSettings.set_string(ACCENT_COLOR, colorName)
		}

		this._indicator = new PanelMenu.Button(0.0, this.metadata.name, false)
		const indicator = this._indicator

		const normalIcon = new St.Icon({
			gicon: Gio.icon_new_for_string(iconsPath + 'color-symbolic.svg'),
			style_class: 'system-status-icon'
		})
		const waitIcon = new St.Icon({
			gicon: Gio.icon_new_for_string(
				iconsPath + 'color-wait-symbolic.svg'
			),
			style_class: 'system-status-icon'
		})
		indicator.add_child(normalIcon)

		Main.panel.addToStatusArea(this.uuid, this._indicator)

		function setAccent() {
			indicator.remove_child(normalIcon)
			indicator.add_child(waitIcon)

			const backgroundPath = (
				getColorScheme() === PREFER_DARK ?
					getDarkBackgroundUri() : getBackgroundUri()
			).replace('file://', '')

			applyClosestAccent(
				extensionPath,
				backgroundPath,
				function(newAccent) {
					console.log('New accent: ' + newAccent)
					setAccentColor(newAccent)
					indicator.remove_child(waitIcon)
					indicator.add_child(normalIcon)
				}
			)
		}

		setAccent()

		// Watch for light background change
		this._backgroundSettings.connect(
			'changed::picture-uri',
			() => {
				if (getColorScheme() !== PREFER_DARK) {
					console.log('Setting accent from picture-uri change.')
					setAccent()
				}
			}
		)

		// Watch for dark background change
		this._backgroundSettings.connect(
			'changed::picture-uri-dark',
			() => {
				if (getColorScheme() === PREFER_DARK) {
					console.log('Setting accent from picture-uri-dark change.')
					setAccent()
				}
			}
		)

		// Watch for light/dark theme change
		this._interfaceSettings.connect(
			'changed::color-scheme',
			() => {
				if (getBackgroundUri() !== getDarkBackgroundUri()) {
					console.log('Setting accent from color-scheme change.')
					setAccent()
				}
			}
		)
	}

	disable() {
		this._indicator?.destroy()
		this._indicator = null
	}
}
