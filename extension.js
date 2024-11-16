import St from 'gi://St'
import Gio from 'gi://Gio'
import GLib from 'gi://GLib'
import * as Main from 'resource:///org/gnome/shell/ui/main.js'
import { Extension, gettext as _ } from
    'resource:///org/gnome/shell/extensions/extension.js'
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js'
import { isImageMagickInstalled, isRsvgConvertAvailable, setLogging, journal } from './utils.js'
import { getExtensionCacheDir, noCache, fileBasedCache } from './cache.js'

const INTERFACE_SCHEMA = 'org.gnome.desktop.interface'
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

    if (delta === 0) {
        return hue // = 0
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
    const delta = maxColourPercentage - minColourPercentage

    let saturation = 0.0

    if (maxColourPercentage !== 0.0) {
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
        this.name = name
        this.r = r
        this.g = g
        this.b = b
        this.hueRange = hueRange
    }
}

// Thank you to andy.holmes on StackOverflow for this Promise wrapper
// https://stackoverflow.com/a/61150669
function execCommand(argv, input = null, cancellable = null) {
    let flags = Gio.SubprocessFlags.STDOUT_PIPE;

    if (input !== null)
        flags |= Gio.SubprocessFlags.STDIN_PIPE;

    let process = new Gio.Subprocess({
        argv: argv,
        flags: flags
    });
    process.init(cancellable);

    return new Promise((resolve, reject) => {
        process.communicate_utf8_async(input, cancellable, (proc, res) => {
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

function getClosestAccentColour(accentColours, r, g, b) {
    let shortestDistance = Number.MAX_VALUE
    let closestAccentIndex = -1

    const hue = getHueFromRGB(r, g, b)
    journal(`Parsed hue: ${hue}`)
    const eligibleAccents = accentColours.filter((accent) => {
        return isHueInRange(hue, accent.hueRange)
    })

    const saturation = getSaturationFromRGB(r, g, b)
    journal(`Parsed saturation: ${saturation}`)
    if (saturation < 5) {
        journal('Returning slate due to low saturation')
        return SLATE_INDEX
    }

    for (let accent of eligibleAccents) {
        let squaredEuclideanDistance = getSquaredEuclideanDistance(
            r, g, b,
            accent.r, accent.g, accent.b
        )

        journal(`Distance from ${accent.name}: ${squaredEuclideanDistance}`)

        if (squaredEuclideanDistance < shortestDistance) {
            shortestDistance = squaredEuclideanDistance
            closestAccentIndex = accentColours.indexOf(accent)
        }
    }

    journal(`Closest accent: ${accentColours[closestAccentIndex].name}`)
    return closestAccentIndex
}

async function clearConvertedBackground() {
    const cacheDirPath = getExtensionCacheDir()
    GLib.remove(`${cacheDirPath}/${CONVERTED_BACKGROUND_FILENAME}`)
}

async function convert(imagePath) {
    // TODO: reuse caching mechanism for converted files?
    const cacheDirPath = getExtensionCacheDir()
    GLib.mkdir_with_parents(cacheDirPath, 0o0755)

    const convertedPath = `${cacheDirPath}/${CONVERTED_BACKGROUND_FILENAME}`
    const convertedFile = Gio.File.new_for_path(convertedPath);

    if (isImageMagickInstalled()) {
        await execCommand(['magick', imagePath, convertedPath])
    } else if (isRsvgConvertAvailable()) {
        await execCommand(['rsvg-convert', imagePath, '>', convertedPath])
    } else {
        throw new Error(`No conversion methods available!`);
    }

    if (!convertedFile.query_exists(null)) {
        throw new Error(`Conversion finished but ${convertedFile.get_path()} does not exist!`);
    }
    return convertedFile;
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
            ['gjs', '-m', `${extensionPath}/color-thief/run-color-thief.js`, imagePath]
        )

        const palette = resultStr.split(';')
        for (let i = 0; i < palette.length; i++) {
            palette[i] = palette[i].split(',').map(Number)
        }
        return palette
    } catch (e) {
        console.error(e)
        return Array(5).fill([0, 0, 0])
    }
}

async function getBackgroundPalette(extensionPath, backgroundPath) {
    try {
        const backgroundPalette = await runColorThief(backgroundPath, extensionPath)
        journal(`Wallpaper colour palette: ${backgroundPalette}`)

        const dominantColourTuple = backgroundPalette[0]
        const highlightColourTuple = backgroundPalette[1]

        return [dominantColourTuple, highlightColourTuple]
    } catch (e) {
        console.error(e)
        return Array(2).fill([0, 0, 0])
    }
}

async function applyClosestAccent(
    extensionPath,
    accentColours,
    backgroundUri,
    cache,
    highlightMode,
    keepConversion,
    onDependencyFail,
    onXmlDetected,
    onFinish
) {
    const backgroundFile = Gio.File.new_for_uri(backgroundUri);
    const backgroundFileInfo = await backgroundFile.query_info_async(
        'standard::*,time::*',
        Gio.FileQueryInfoFlags.NOFOLLOW_SYMLINKS,
        GLib.PRIORITY_DEFAULT,
        null
    )
    const backgroundImgFormat = backgroundFileInfo.get_content_type()

    journal(`Background image format: ${backgroundImgFormat}`)

    /* suggestion (HM); replace below logic with map of image type to converters (array of functions); e.g.
     * const converter_map = {
     *     'image/svg+xml': [magick, rsvg],
     *     'image/jxl': [magick],
     *     'application/xml': [panic],
     * }
     * const converters = converter_map[backgroundImgFormat]
     * then loop converters until one works, returning converted fp, or panic (maybe collect errs)
     */

    if (backgroundImgFormat === 'application/xml') {
        onXmlDetected()
        return
    }

    /* List of image formats that don't work well with colorthief, and often
    cause crashes or return incorrect colours as a result, requiring conversion.
    If you know of any other formats that don't work well with this extension,
    please submit an issue or pull request. */
    const incompatibleFormats = ['image/svg+xml', 'image/jxl']
    const conversionRequired = incompatibleFormats.includes(backgroundImgFormat)
    journal(`Conversion to JPG required: ${conversionRequired}`)

    let rasterFile = backgroundFile;
    if (conversionRequired) {
        if (!isImageMagickInstalled()) {
            if (backgroundImgFormat === 'image/svg+xml') {
                if (!isRsvgConvertAvailable()) {
                    journal('ImageMagick v7+ not installed nor rsvg-convert available !!')
                    onDependencyFail()
                    return
                }
            } else {
                journal('ImageMagick v7+ not installed !!')
                onDependencyFail()
                return
            }
        }

        try {
            rasterFile = await convert(backgroundFile.get_path());
        } catch (err) {
            console.log(`Failed to convert background: ${err}`);
            return;
        }
    }

    const bytes = rasterFile.load_bytes(null)[0];
    const backgroundHash = bytes.hash();
    journal(`Hash of background in ${rasterFile.get_path()} is ${backgroundHash}...`);
    let backgroundPalette = cache.get(backgroundHash)
    if (backgroundPalette === null) {
        journal(`Cache miss: recomputing palette...`);
        const rasterPath = rasterFile.get_path();
        backgroundPalette = await getBackgroundPalette(extensionPath, rasterPath)
        cache.set(backgroundHash, backgroundPalette);
    }
    journal(`Palette: ${backgroundPalette}...`);

    if (conversionRequired && !keepConversion) {
        clearConvertedBackground()
    }

    const accentType = highlightMode ? 'highlight' : 'dominant';
    const paletteIndex = highlightMode ? 1 : 0;
    const [r, g, b] = backgroundPalette[paletteIndex];

    journal(`Getting ${accentType} accent...`)
    const closestAccentIndex = getClosestAccentColour(accentColours, r, g, b)
    const closestAccent = accentColours[closestAccentIndex]

    journal(`Accent to apply: ${closestAccent.name}`)
    onFinish(closestAccent)
}

export default class AutoAccentColourExtension extends Extension {
    enable() {
        /* Hue values are:
        0 = Red
        60 = Yellow
        120 = Green
        180 = Cyan
        240 = Blue
        300 = Magenta
        */
        const gnomeAccents = [
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
        const ubuntuAccents = [
            /* The same as above applies to these accents */
            new AccentColour('blue', 0, 0, 255, new HueRange(180, 300)),
            new AccentColour('teal', 0, 255, 255, new HueRange(120, 240)),
            new AccentColour('green', 0, 191, 0, new HueRange(50, 180)),
            new AccentColour('yellow', 200, 150, 0, new HueRange(29, 70)),
            new AccentColour('orange', 237, 91, 0, new HueRange(0, 70)),
            new AccentColour('red', 230, 0, 26, new HueRange(300, 22)),
            new AccentColour('pink', 213, 0, 103, new HueRange(240, 0)),
            new AccentColour('purple', 145, 65, 172, new HueRange(240, 330)),
            new AccentColour('slate', 166, 166, 166, new HueRange(50, 180))
        ]
        const extensionPath = this.path

        this._settings = this.getSettings()
        const extensionSettings = this._settings

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
            return interfaceSettings.get_string('color-scheme')
        }
        function setAccentColor(colorName) {
            interfaceSettings.set_string(ACCENT_COLOR, colorName)
        }
        function getAccentColor() {
            return interfaceSettings.get_string(ACCENT_COLOR)
        }
        function setIconTheme(theme) {
            interfaceSettings.set_string('icon-theme', theme)
        }
        function getIconTheme() {
            return interfaceSettings.get_string('icon-theme')
        }
        function setGtkTheme(theme) {
            interfaceSettings.set_string('gtk-theme', theme)
        }
        function getGtkTheme() {
            return interfaceSettings.get_string('gtk-theme')
        }

        function getDisableCache() {
            return extensionSettings.get_boolean('disable-cache')
        }
        function getCache() {
            return getDisableCache() ? noCache() : fileBasedCache(getExtensionCacheDir())
        }

        function getKeepConversion() {
            return extensionSettings.get_boolean('keep-conversion')
        }

        function applyYaruTheme() {
            const iconTheme = getIconTheme()
            const gtkTheme = getGtkTheme()

            const yaruThemes = [
                'Yaru-blue',
                'Yaru-blue-dark',
                'Yaru-prussiangreen',
                'Yaru-prussiangreen-dark',
                'Yaru-olive',
                'Yaru-olive-dark',
                'Yaru-yellow',
                'Yaru-yellow-dark',
                'Yaru',
                'Yaru-dark',
                'Yaru-red',
                'Yaru-red-dark',
                'Yaru-magenta',
                'Yaru-magenta-dark',
                'Yaru-purple',
                'Yaru-purple-dark',
                'Yaru-sage',
                'Yaru-sage-dark',
                'Yaru-wartybrown',
                'Yaru-wartybrown-dark'
            ]

            function getYaruColour() {
                switch (getAccentColor()) {
                    case 'blue': return '-blue'
                    case 'teal': return '-prussiangreen'
                    case 'green': return '-olive'
                    case 'yellow': return '-yellow'
                    case 'orange': return ''
                    case 'red': return '-red'
                    case 'pink': return '-magenta'
                    case 'purple': return '-purple'
                    case 'slate': return '-sage'
                    default: return ''
                }
            }

            const yaruDark = getColorScheme() === PREFER_DARK ? '-dark' : ''

            const yaruTheme = `Yaru${getYaruColour()}${yaruDark}`

            if (yaruThemes.includes(iconTheme)) {
                setIconTheme(yaruTheme)
                journal(`Applied icon theme as ${yaruTheme}`)
            }

            if (yaruThemes.includes(gtkTheme)) {
                setGtkTheme(yaruTheme)
                journal(`Applied GTK theme as ${yaruTheme}`)
            }
        }

        setLogging(this._settings.get_boolean('debug-logging'))

        const onUbuntu = Main.sessionMode.currentMode === 'ubuntu'
        journal(`Running on Ubuntu: ${onUbuntu}`)

        const accentColours = onUbuntu ? ubuntuAccents : gnomeAccents

        function getIcon(iconName) {
            return new St.Icon({
                gicon: Gio.icon_new_for_string(
                    `${extensionPath}/icons/${iconName}.svg`
                ),
                style_class: 'system-status-icon'
            })
        }

        this._indicator = new PanelMenu.Button(0.0, this.metadata.name, false)
        const indicator = this._indicator

        const normalIcon = getIcon('color-symbolic')
        const waitIcon = getIcon('color-wait-symbolic')
        const alertIcon = getIcon('color-alert-symbolic')

        let currentIcon = normalIcon
        indicator.add_child(currentIcon)

        function changeIndicatorIcon(newIcon) {
            indicator.remove_child(currentIcon)
            currentIcon = newIcon
            indicator.add_child(currentIcon)
        }

        let running = false

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
            if (running) {
                journal(`Already running...`)
                return
            }

            running = true

            changeIndicatorIcon(waitIcon)

            const backgroundUri = getColorScheme() === PREFER_DARK
                ? getDarkBackgroundUri()
                : getBackgroundUri()

            const highlightMode = extensionSettings.get_boolean('highlight-mode')

            applyClosestAccent(
                extensionPath,
                accentColours,
                backgroundUri,
                getCache(),
                highlightMode,
                getKeepConversion(),
                function() {
                    Main.notifyError(
                        _('Optional dependencies required for this background'),
                        _('Visit Auto Accent Colour\'s preferences page to learn more')
                    )
                    changeIndicatorIcon(alertIcon)
                    running = false
                },
                function() {
                    Main.notifyError(
                        _('XML backgrounds not supported'),
                        _('Auto Accent Colour will not run on this background')
                    )
                    changeIndicatorIcon(alertIcon)
                    running = false
                },
                function(newAccent) {
                    setAccentColor(newAccent.name)
                    applyYaruTheme(),
                    journal(`New accent: ${getAccentColor()}`)
                    changeIndicatorIcon(normalIcon)
                    running = false
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
                    journal('Setting accent from picture-uri change.')
                    setAccent()
                }
            }
        )

        // Watch for dark background change
        this._darkBackgroundHandler = this._backgroundSettings.connect(
            'changed::picture-uri-dark',
            () => {
                if (getColorScheme() === PREFER_DARK) {
                    journal('Setting accent from picture-uri-dark change.')
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
                if (eventType === Gio.FileMonitorEvent.CREATED) {
                    journal('Background file changed.')
                    setAccent()
                }
            }
        )

        // Watch for light/dark theme change
        this._colorSchemeHandler = this._interfaceSettings.connect(
            'changed::color-scheme',
            () => {
                if (getBackgroundUri() !== getDarkBackgroundUri()) {
                    journal('Setting accent from color-scheme change.')
                    setAccent()
                }
            }
        )

        // Watch for 'hide indicator' setting change
        this._hideIndicatorHandler = this._settings.connect(
            'changed::hide-indicator',
            (settings, key) => {
                journal(`${key} = ${settings.get_value(key).print(true)}`)
            }
        )

        this._highlightModeHandler = this._settings.connect(
            'changed::highlight-mode',
            (settings, key) => {
                journal(`${key} = ${settings.get_value(key).print(true)}`)
                setAccent()
            }
        )

        this._debugModeHandler = this._settings.connect(
            'changed::debug-logging',
            (settings, key) => {
                setLogging(settings.get_boolean(key))
                journal(`${key} = ${settings.get_value(key).print(true)}`)
            }
        )
        this._keepConversionHandler = this._settings.connect(
            'changed::keep-conversion',
            (settings, key) => {
                const value = settings.get_boolean(key)
                journal(`${key} = ${value}`)
                if (value === false) {
                    clearConvertedBackground()
                }
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
        if (this._backgroundFileHandler) {
            this._backgroundFileMonitor.disconnect(this._backgroundFileHandler)
            this._backgroundFileHandler = null
        }
        if (this._colorSchemeHandler) {
            this._interfaceSettings.disconnect(this._colorSchemeHandler)
            this._colorSchemeHandler = null
        }
        if (this._hideIndicatorHandler) {
            this._settings.disconnect(this._hideIndicatorHandler)
            this._hideIndicatorHandler = null
        }
        if (this._highlightModeHandler) {
            this._settings.disconnect(this._highlightModeHandler)
            this._hideIndicatorHandler = null
        }
        if (this._debugModeHandler) {
            this._settings.disconnect(this._debugModeHandler)
            this._debugModeHandler = null
        }
        if (this._keepConversionHandler) {
            this._settings.disconnect(this._keepConversionHandler)
            this._keepConversionHandler = null
        }

        this._indicator?.destroy()
        this._indicator = null
        this._settings = null
        this._interfaceSettings = null
        this._backgroundSettings = null
        this._backgroundFileMonitor = null
    }
}
