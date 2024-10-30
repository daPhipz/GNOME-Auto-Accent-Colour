// TODO: Add Extensions store page support
// TODO: Add some kind of fullscreen mode checker to prevent performance loss?
// TODO: Add accent colour preview in cache preferences
// TODO: Review console logging
// TODO: Add random accent colour mode?
// TODO: Add descriptions to schema keys
// TODO: Investigate imagemagick SVG conversion causing artefacts
// TODO: Review duplicate script-runs from background file change and uri change
// TODO: Review string concatenation, and switch to template literals
// TODO: Use backticks and newlines for very long strings
// TODO: Research converting UI text into multiple languages
// TODO: Investigate script sometimes not running when it should.
// TODO: Consider moving some data structures to enable() local methods
// TODO: Maybe remove some of the static string constants?

import St from 'gi://St'
import Gio from 'gi://Gio'
import GLib from 'gi://GLib'
import * as Main from 'resource:///org/gnome/shell/ui/main.js'
import {Extension, gettext as _} from
	'resource:///org/gnome/shell/extensions/extension.js'
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js'
import isImageMagickInstalled from './utils.js'

const INTERFACE_SCHEMA = 'org.gnome.desktop.interface'
const COLOR_SCHEME = 'color-scheme'
const PREFER_DARK = 'prefer-dark'
const ACCENT_COLOR = 'accent-color'
const BACKGROUND_SCHEMA = 'org.gnome.desktop.background'
const PICTURE_URI = 'picture-uri'
const PICTURE_URI_DARK = 'picture-uri-dark'
const SLATE_INDEX = 8

const CONVERTED_BACKGROUND_FILENAME = 'converted_bg.jpg'

function getHueFromRGB(r, g, b) {
	const maxColour = Math.max(r, g, b)
	const minColour = Math.min(r, g, b)
	const delta = maxColour - minColour

	let hue = 0

	if (delta == 0) {
		return hue // == 0
	}

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
	new AccentColour('blue', 0, 0, 255, new HueRange(180, 300)),
	new AccentColour('teal', 0, 255, 255, new HueRange(120, 240)),
	new AccentColour('green', 0, 191, 0, new HueRange(50, 180)),
	new AccentColour('yellow', 200, 150, 0, new HueRange(29, 70)),
	new AccentColour('orange', 237, 91, 0, new HueRange(0, 70)),
	new AccentColour('red', 230, 0, 26, new HueRange(300, 22)),
	new AccentColour('pink', 213, 0, 103, new HueRange(240, 0)),
	new AccentColour('purple', 145, 65, 172, new HueRange(240, 330)),
	new AccentColour('slate', 166, 166, 166, new HueRange(180, 300))
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
	let closestAccentIndex = -1

	const hue = getHueFromRGB(r, g, b)
	console.log('Parsed hue: ' + hue)
	const eligibleAccents = accentColours.filter((accent) => {
		return isHueInRange(hue, accent.hueRange)
	})

	const saturation = getSaturationFromRGB(r, g, b)
	console.log('Parsed saturation: ' + saturation)
	if (saturation < 5) {
		return SLATE_INDEX
	}

	for (let accent of eligibleAccents) {
		let squaredEuclideanDistance = getSquaredEuclideanDistance(
			r, g, b,
			accent.r, accent.g, accent.b
		)

		console.log("Distance from " + accent.name + ": " + squaredEuclideanDistance)

		if (squaredEuclideanDistance < shortestDistance) {
			shortestDistance = squaredEuclideanDistance
			closestAccentIndex = accentColours.indexOf(accent)
		}
	}

	return closestAccentIndex
}

function getExtensionCacheDir() {
	return `${GLib.get_home_dir()}/.cache/auto-accent-colour`
}

async function clearConvertedBackground() {
	const cacheDirPath = getExtensionCacheDir()
	GLib.remove(`${cacheDirPath}/${CONVERTED_BACKGROUND_FILENAME}`)
}

async function convert(imagePath) {
	try {
		const cacheDirPath = getExtensionCacheDir()
		GLib.mkdir_with_parents(cacheDirPath, 755)

		const convertedPath = `${cacheDirPath}/${CONVERTED_BACKGROUND_FILENAME}`
		await execCommand(['magick', imagePath, convertedPath])

		return convertedPath
	} catch (e) {
		logError(e)
	}
}

/*
Crusty way of getting colorthief to run without blocking the main thread.
I have no idea how to use multithreading in GJS, so I just spawn a new
GJS subprocess to run the colorthief script asynchronously, and convert its
stdout from a string back into an array of numbers. If you have a more elegant
solution, please feel free to submit a pull request.
*/
async function runColorThief(imagePath, extensionPath) {
	try {
		const resultStr = await execCommand(
			['gjs', '-m', extensionPath + '/tools/run-color-thief.js', imagePath]
		)

		const palette = resultStr.split(';')
		console.log('palette after splitting semicolons: ' + palette[0])
		for (let i = 0; i < palette.length; i++) {
			palette[i] = palette[i].split(',').map(Number)
		}
		console.log(palette[0])
		return palette
	} catch (e) {
		logError(e)
	}
}

async function getBackgroundPalette(extensionPath, backgroundPath, cachedHash) {
	try {
		const backgroundPalette = await runColorThief(backgroundPath, extensionPath)
		console.log('Colorthief result: ' + backgroundPalette)

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
	cachedHash,
	cachedAccentIndex,
	addToCache,
	highlightMode,
	onDependencyFail,
	onFinish
) {
	console.log('Cached hash: ' + cachedHash)

	const backgroundFile = Gio.File.new_for_path(backgroundPath)
	const backgroundHash = backgroundFile.hash()
	console.log(`Background hash: ${backgroundHash}`)

	if (backgroundHash == cachedHash) {
		const cachedAccent = accentColours[cachedAccentIndex]
		console.log('Returning cached accent (' + cachedAccent.name + ')')
		onFinish(cachedAccent)
	} else {
		const backgroundFileInfo = await backgroundFile.query_info_async(
			'standard::*',
			Gio.FileQueryInfoFlags.NOFOLLOW_SYMLINKS,
			GLib.PRIORITY_DEFAULT,
			null
		)
		const backgroundImgFormat = backgroundFileInfo.get_content_type()
		console.log('Background image format: ' + backgroundImgFormat)

		/* List of image formats that don't work well with colorthief, and often
		cause crashes or return incorrect colours as a result, requiring conversion.
		If you know of any other formats that don't work well with this extension,
		please submit an issue or pull request. */
		const incompatibleFormats = ['image/svg+xml', 'image/jxl']
		const conversionRequired = incompatibleFormats.includes(backgroundImgFormat)

		console.log(`Conversion to JPG required: ${conversionRequired}`)

		if (conversionRequired) {
			console.log('About to run magick installed checker')
			const magickInstalled = isImageMagickInstalled()
			if (!magickInstalled) {
				console.log("Imagemagick not installed !!")
				onDependencyFail()
				return
			}
		}

		const rasterPath = conversionRequired
			? await convert(backgroundPath)
			: backgroundPath
		console.log(`Raster path: ${rasterPath}`)

		const backgroundPalette = await getBackgroundPalette(
			extensionPath,
			rasterPath
		)

		if (conversionRequired) { clearConvertedBackground() }

		const [dom_r, dom_g, dom_b] = backgroundPalette[0] // Dominant RGB value
		const dom_accent = getClosestAccentColour(dom_r, dom_g, dom_b) // Dominant accent

		const [hi_r, hi_g, hi_b] = backgroundPalette[1] // Highlight RGB value
		const hi_accent = getClosestAccentColour(hi_r, hi_g, hi_b) // Highlight accent

		addToCache(backgroundHash, dom_accent, hi_accent)

		const paletteIndex = highlightMode ? 1 : 0

		console.log('Parsed R: ' + backgroundPalette[paletteIndex][0])
		console.log('Parsed G: ' + backgroundPalette[paletteIndex][1])
		console.log('Parsed B: ' + backgroundPalette[paletteIndex][2])

		const closestAccentIndex = highlightMode ? hi_accent : dom_accent
		const closestAccent = accentColours[closestAccentIndex]

		console.log("Closest accent: " + closestAccent.name)

		onFinish(closestAccent)
	}
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
		function getAccentColor(colorName) {
			interfaceSettings.get_string(ACCENT_COLOR)
		}

		function getCachedHash() {
			return settings.get_int64(getColorScheme() == PREFER_DARK ? 'dark-hash' : 'light-hash')
		}
		function getCachedAccent() {
			const theme = getColorScheme() == PREFER_DARK ? 'dark' : 'light'
			const colourMode = settings.get_boolean('highlight-mode') ? 'highlight' : 'dominant'

			return settings.get_enum(`${theme}-${colourMode}-accent`)
		}
		function cache(backgroundHash, dominantAccent, highlightAccent) {
			const currentTheme = getColorScheme() == PREFER_DARK ? 'dark' : 'light'
			const backgroundsAreSame = getBackgroundUri() == getDarkBackgroundUri()

			for (const theme of ['dark', 'light']) {
				if (currentTheme == theme || backgroundsAreSame) {
					settings.set_int64(`${theme}-hash`, backgroundHash)
					settings.set_enum(`${theme}-dominant-accent`, dominantAccent)
					settings.set_enum(`${theme}-highlight-accent`, highlightAccent)
				}
			}
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
			_('Force Refresh'),
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
				getCachedHash(),
				getCachedAccent(),
				cache,
				highlightMode,
				function() {
					Main.notifyError(
						_('ImageMagick not installed'), _('ImageMagick is required to set an accent colour from this background')
					)
					changeIndicatorIcon(alertIcon)
				},
				function(newAccent) {
					setAccentColor(newAccent.name)
					console.log(`New accent: ${getAccentColor()}`)
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
