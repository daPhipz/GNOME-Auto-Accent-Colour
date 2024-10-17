// TODO: Add Extensions store page support
// TODO: Add some kind of fullscreen mode checker to prevent performance loss?
// TODO: Cache wallpaper hashes and associated colours to reduce need to run ColorThief
// TODO: Review console logging
// TODO: Add random accent colour mode?
// TODO: Add descriptions to schema keys
// TODO: Make color-thief work fully asynchronously
// TODO: Investigate imagemagick SVG conversion causing artefacts
// TODO: Add checker to find if imagemagick is installed
// TODO: Review duplicate script-runs from background file change and uri change

import St from 'gi://St'
import Gio from 'gi://Gio'
import GLib from 'gi://GLib'
import * as Main from 'resource:///org/gnome/shell/ui/main.js'
import {Extension, gettext as _} from
	'resource:///org/gnome/shell/extensions/extension.js'
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js'
import getPalette from './tools/color-thief.js'

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

function getHueFromRGB(r, g, b) {
	const maxColour = Math.max(r, g, b)
	const minColour = Math.min(r, g, b)
	const delta = maxColour - minColour

	let hue = 0

	switch (maxColour) {
		case r:
			hue = (g - b) / delta
			break
		case g:
			hue = 2 + (b - r) / delta
			break
		case b:
			hue = 4 + (r - g) / delta
			break
	}

	hue *= 60
	if (hue < 0) { hue += 360 }

	return hue
}

function getSaturationFromRGB(r, g, b) {
	const maxColourPercentage = Math.max(r, g, b) / 255
	const minColourPercentage = Math.min(r, g, b) / 255
	console.log('cMax: ' + maxColourPercentage)
	const delta = maxColourPercentage - minColourPercentage
	console.log('Delta: ' + delta)

	let saturation = 0.0

	if (maxColourPercentage != 0.0) {
		saturation = delta / maxColourPercentage
	}

	return saturation * 100
}

class HueRange {
	constructor(lowerBound, upperBound) {
		this.lowerBound = lowerBound
		this.upperBound = upperBound
	}
}

class AccentColour {
	constructor(name, r, g, b, hueRange) {
		this.name = name,
		this.r = r
		this.g = g
		this.b = b
		this.hueRange = hueRange
	}
}

/* Hue values are:
0 = Red
60 = Yellow
120 = Green
180 = Cyan
240 = Blue
300 = Magenta
*/
const accentColours = [
	/* The RGB values set in these accent colour entries are *not* the RGB
	values of the same accent colours you would find in the GNOME appearance
	settings. They are exaggerated to add further distinction between them, so
	that a greater variety of accents can be returned from different backgrounds
	and their derived colours. */
	new AccentColour(BLUE, 0, 0, 255, new HueRange(180, 300)),
	new AccentColour(TEAL, 0, 255, 255, new HueRange(120, 240)),
	new AccentColour(GREEN, 0, 191, 0, new HueRange(50, 180)),
	new AccentColour(YELLOW, 200, 150, 0, new HueRange(29, 70)),
	new AccentColour(ORANGE, 237, 91, 0, new HueRange(0, 70)),
	new AccentColour(RED, 230, 0, 26, new HueRange(300, 22)),
	new AccentColour(PINK, 213, 0, 103, new HueRange(240, 0)),
	new AccentColour(PURPLE, 145, 65, 172, new HueRange(240, 330)),
	new AccentColour(SLATE, 166, 166, 166, new HueRange(180, 300))
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

function isHueInRange(hue, hueRange) {
	if (hue >= hueRange.lowerBound && hue <= hueRange.upperBound) {
		return true
	} else if (hueRange.lowerBound > hueRange.upperBound) {
		// Check for wrapping

		return hue >= hueRange.lowerBound || hue <= hueRange.upperBound
	}

	return false
}

function getClosestAccentColour(r, g, b) {
	let shortestDistance = Number.MAX_VALUE
	let closestAccent = ''

	const hue = getHueFromRGB(r, g, b)
	console.log('Parsed hue: ' + hue)
	const eligibleAccents = accentColours.filter((accent) => {
		return isHueInRange(hue, accent.hueRange)
	})

	const saturation = getSaturationFromRGB(r, g, b)
	console.log('Parsed saturation: ' + saturation)
	if (saturation < 5) {
		return SLATE
	}

	for (let accent of eligibleAccents) {
		let squaredEuclideanDistance = getSquaredEuclideanDistance(
			r, g, b,
			accent.r, accent.g, accent.b
		)

		console.log("Distance from " + accent.name + ": " + squaredEuclideanDistance)

		if (squaredEuclideanDistance < shortestDistance) {
			shortestDistance = squaredEuclideanDistance
			closestAccent = accent.name
		}
	}

	console.log("Closest accent: " + closestAccent)

	return closestAccent
}

async function convert(imagePath, extensionPath) {
	try {
		const cacheDir = extensionPath + '/cached/'
		await execCommand(['mkdir', cacheDir])
		await execCommand(['magick', imagePath, cacheDir + '/converted_bg.jpg'])
	} catch (e) {
		logError(e)
	}
}

async function getBackgroundPalette(extensionPath, backgroundPath) {
	try {
		const backgroundFileExtension = backgroundPath.split('.').pop()
		let rasterPath = ''

		if (['svg', 'jxl'].includes(backgroundFileExtension)) {
			await convert(backgroundPath, extensionPath)
			rasterPath = extensionPath + '/cached/converted_bg.jpg'
		} else {
			rasterPath = backgroundPath
		}

		const backgroundPalette = getPalette(rasterPath)
		//const backgroundPalette = [[119, 103, 87], []]
		//TODO: Remove this line when done with it
		console.log('Type: ' + typeof(backgroundPalette))
		console.log('Wallpaper colour palette: ' + backgroundPalette)

		const dominantColourTuple = backgroundPalette[0]
		const highlightColourTuple = backgroundPalette[1]

		return [dominantColourTuple, highlightColourTuple]
	} catch (e) {
		logError(e)
	}
}

async function applyClosestAccent(
	extensionPath,
	backgroundPath,
	highlightMode,
	onFinish
) {
	const backgroundPalette = await getBackgroundPalette(
		extensionPath,
		backgroundPath
	)

	const paletteIndex = highlightMode ? 1 : 0

	console.log('Parsed R: ' + backgroundPalette[paletteIndex][0])
	console.log('Parsed G: ' + backgroundPalette[paletteIndex][1])
	console.log('Parsed B: ' + backgroundPalette[paletteIndex][2])

	const [wall_r, wall_g, wall_b] = backgroundPalette[paletteIndex]
	const closestAccent = getClosestAccentColour(wall_r, wall_g, wall_b)

	onFinish(closestAccent)
}

export default class AutoAccentColourExtension extends Extension {
	enable() {
		const extensionPath = this.path
		const iconsPath = extensionPath + '/icons/'

		this._settings = this.getSettings()
		const settings = this._settings

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
		const alertIcon = new St.Icon({
			gicon: Gio.icon_new_for_string(
				iconsPath + 'color-alert-symbolic.svg'
			),
			style_class: 'system-status-icon'
		})

		let currentIcon = normalIcon
		indicator.add_child(currentIcon)

		function changeIndicatorIcon(newIcon) {
			indicator.remove_child(currentIcon)
			currentIcon = newIcon
			indicator.add_child(currentIcon)
		}

		Main.panel.addToStatusArea(this.uuid, this._indicator)

		indicator.menu.addAction(
			_('Refresh'),
			() => setAccent()
		)

		indicator.menu.addAction(
			_('Preferences'),
			() => this.openPreferences()
		)

		function setAccent() {
			changeIndicatorIcon(waitIcon)

			const backgroundPath = (
				getColorScheme() === PREFER_DARK ?
					getDarkBackgroundUri() : getBackgroundUri()
			).replace('file://', '')

			const highlightMode = settings.get_boolean('highlight-mode')

			applyClosestAccent(
				extensionPath,
				backgroundPath,
				highlightMode,
				function(newAccent) {
					console.log('New accent: ' + newAccent)
					setAccentColor(newAccent)
					changeIndicatorIcon(normalIcon)
				}
			)
		}

		setAccent()

		this._settings.bind(
			'hide-indicator',
			this._indicator,
			'visible',
			Gio.SettingsBindFlags.INVERT_BOOLEAN
		)

		// Watch for light background change
		this._lightBackgroundHandler = this._backgroundSettings.connect(
			'changed::picture-uri',
			() => {
				if (getColorScheme() !== PREFER_DARK) {
					console.log('Setting accent from picture-uri change.')
					setAccent()
				}
			}
		)

		// Watch for dark background change
		this._darkBackgroundHandler = this._backgroundSettings.connect(
			'changed::picture-uri-dark',
			() => {
				if (getColorScheme() === PREFER_DARK) {
					console.log('Setting accent from picture-uri-dark change.')
					setAccent()
				}
			}
		)

		const backgroundFilePath = GLib.get_home_dir() + '/.config/background'
		const backgroundFile = Gio.File.new_for_path(backgroundFilePath)
		this._backgroundFileMonitor = backgroundFile.monitor(
			Gio.FileMonitorFlags.NONE,
			null
		)

		this._backgroundFileHandler = this._backgroundFileMonitor.connect(
			'changed',
			(_fileMonitor, file, otherFile, eventType) => {
				if (eventType == Gio.FileMonitorEvent.CREATED) {
					console.log('Background file changed.')
					setAccent()
				}
			}
		)

		// Watch for light/dark theme change
		this._colorSchemeHandler = this._interfaceSettings.connect(
			'changed::color-scheme',
			() => {
				if (getBackgroundUri() !== getDarkBackgroundUri()) {
					console.log('Setting accent from color-scheme change.')
					setAccent()
				}
			}
		)

		// Watch for 'hide indicator' setting change
		this._hideIndicatorHandler = this._settings.connect(
			'changed::hide-indicator',
			(settings, key) => {
				console.debug(`${key} = ${settings.get_value(key).print(true)}`)
			}
		)

		this._highlightModeHandler = this._settings.connect(
			'changed::highlight-mode',
			(settings, key) => {
				console.log(`${key} = ${settings.get_value(key).print(true)}`)
				setAccent()
			}
		)
	}

	disable() {
		if (this._lightBackgroundHandler) {
			this._backgroundSettings.disconnect(this._lightBackgroundHandler)
			this._lightBackgroundHandler = null
		}
		if (this._darkBackgroundHandler) {
			this._backgroundSettings.disconnect(this._darkBackgroundHandler)
			this._darkBackgroundHandler = null
		}
		if (this._colorSchemeHandler) {
			this._interfaceSettings.disconnect(this._colorSchemeHandler)
			this._colorSchemeHandler = null
		}
		if (this._hideIndicatorHandler) {
			this._settings.disconnect(this._hideIndicatorHandler)
			this._hideIndicatorHandler = null
		}
		if (this._backgroundFileHandler) {
			this._backgroundFileMonitor.disconnect(this._backgroundFileHandler)
			this._backgroundFileHandler = null
		}

		this._indicator?.destroy()
		this._indicator = null
		this._settings = null
		this._interfaceSettings = null
		this._backgroundSettings = null
		this._backgroundFileMonitor = null
	}
}
