import Gio from 'gi://Gio'
import Adw from 'gi://Adw'
import Gtk from 'gi://Gtk'
import GLib from 'gi://GLib'
import { ExtensionPreferences, gettext as _, pgettext } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js'
import { isImageMagickInstalled, isRsvgConvertAvailable } from './utils.js'

const LIGHT = 'light'
const DARK = 'dark'
const DOMINANT = 'dominant'
const HIGHLIGHT = 'highlight'

export default class AutoAccentColourPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        window._settings = this.getSettings()
        const settings = window._settings
        const iconsDir = `${this.path}/icons`

        function getIcon(iconName) {
            return new Gtk.Image({
                gicon: Gio.icon_new_for_string(`${iconsDir}/${iconName}.svg`)
            })
        }

        // Dependencies page ///////////////////////////////////////////////////

        const dependenciesPage = new Adw.PreferencesPage({
            title: _('Setup'),
            icon_name: 'package-x-generic-symbolic'
        })
        window.add(dependenciesPage)

        const refreshButton = new Gtk.Button({
            icon_name: 'view-refresh-symbolic',
            tooltip_text: _('Refresh'),
            valign: Gtk.Align.CENTER,
            css_classes: ['flat']
        })

        const systemDependenciesGroup = new Adw.PreferencesGroup({
            title: _('Optional Dependencies'),
            header_suffix: refreshButton,
            description: _(
                'ImageMagick v7+ is required to parse colour data from SVG and JXL \
backgrounds. It must be installed via the system package manager. In cases where \
only older versions ImageMagick are available, rsvg-convert can be used as a fallback \
for SVG files only. This extension will still function without either dependency, \
but it won\'t work on SVG and JXL files.'
            )
        })
        dependenciesPage.add(systemDependenciesGroup)

        const imageMagickRow = new Adw.ActionRow({
            title: 'ImageMagick v7+',
            css_classes: ['property']
        })
        systemDependenciesGroup.add(imageMagickRow)

        const rsvgConvertRow = new Adw.ActionRow({
            title: 'rsvg-convert',
            css_classes: ['property']
        })
        systemDependenciesGroup.add(rsvgConvertRow)

        ////////////////////////////////////////////////////////////////////////

        // Settings page ///////////////////////////////////////////////////////

        const settingsPage = new Adw.PreferencesPage({
            title: _('Settings'),
            icon_name: 'applications-system-symbolic'
        })
        window.add(settingsPage)

        const appearanceGroup = new Adw.PreferencesGroup({
            title: _('Appearance')
        })
        settingsPage.add(appearanceGroup)

        const indicatorRow = new Adw.SwitchRow({
            title: _('Hide Indicator')
        })
        appearanceGroup.add(indicatorRow)

        const paletteGroup = new Adw.PreferencesGroup({
            title: _('Colour Palette'),
            description: _(
                'Choose the type of background colour to base the shell accent colour from'
            )
        })
        settingsPage.add(paletteGroup)

        const dominantColourRadio = new Gtk.CheckButton({
            valign: Gtk.Align.CENTER,
            action_target: new GLib.Variant('s', 'dominant')
        })
        const dominantColourRow = new Adw.ActionRow({
            title: _('Dominant'),
            subtitle: _('Use the most frequent colour from the background'),
            activatable_widget: dominantColourRadio
        })
        dominantColourRow.add_prefix(dominantColourRadio)
        paletteGroup.add(dominantColourRow)

        const highlightColourRadio = new Gtk.CheckButton({
            valign: Gtk.Align.CENTER,
            group: dominantColourRadio,
            action_target: new GLib.Variant('s', 'highlight')
        })
        const highlightColourRow = new Adw.ActionRow({
            title: _('Highlight'),
            subtitle: _(
                'Use a contrasting yet complimentary colour from the background. \
This may sometimes be the same as the dominant colour.'
            ),
            activatable_widget: highlightColourRadio
        })
        highlightColourRow.add_prefix(highlightColourRadio)
        paletteGroup.add(highlightColourRow)

        const devToolsGroup = new Adw.PreferencesGroup({
            title: _('Developer Tools')
        })
        settingsPage.add(devToolsGroup)

        const debugLoggingRow = new Adw.SwitchRow({
            title: _('Debug Logging'),
            subtitle: _('Print debug messages to the system journal')
        })
        devToolsGroup.add(debugLoggingRow)

        const keepConversionRow = new Adw.SwitchRow({
            title: _('Keep Converted Background Image'),
            subtitle: _(
                "Don't auto-clear temporary conversions of SVG and JXL backgrounds \
into JPG format. These files can be found at %s."
            ).format('~/.cache/auto-accent-colour/')
        })
        devToolsGroup.add(keepConversionRow)

        const ignoreCachesRow = new Adw.SwitchRow({
            title: _('Ignore Caches'),
            subtitle: _("Always parse colours from the background, even if accent \
colours from a given background have already been derived and cached. This reduces \
performance.")
        })
        devToolsGroup.add(ignoreCachesRow)

        ////////////////////////////////////////////////////////////////////////

        // Cache page //////////////////////////////////////////////////////////

        const cachePage = new Adw.PreferencesPage({
            title: _('Cache'),
            icon_name: 'drive-harddisk-symbolic'
        })
        window.add(cachePage)

        const cacheDescriptionGroup = new Adw.PreferencesGroup({
            description: _(
                'Information about backgrounds and their derived accent colours is cached to increase performance'
            )
        })
        cachePage.add(cacheDescriptionGroup)

        function createDeleteButton() {
            return new Gtk.Button({
                valign: Gtk.Align.CENTER,
                tooltip_text: _('Clear'),
                icon_name: 'user-trash-symbolic',
                css_classes: ['destructive-action', 'flat']
            })
        }

        const hashTitle = _('File Hash')
        const noCacheMsg = _('Nothing cached')
        const lastChangeTitle = _('Time Last Modified Hash')
        const dominantAccentTitle = _('Dominant Accent')
        const highlightAccentTitle = _('Highlight Accent')

        // Light background

        const lightBackgroundDeleteBtn = createDeleteButton()

        const lightBackgroundGroup = new Adw.PreferencesGroup({
            title: _('Light Background'),
            header_suffix: lightBackgroundDeleteBtn
        })
        cachePage.add(lightBackgroundGroup)

        const lightNoCacheRow = new Adw.ActionRow({
            title: noCacheMsg
        })
        lightBackgroundGroup.add(lightNoCacheRow)

        const lightHashRow = new Adw.ActionRow({
            title: hashTitle,
            subtitle_selectable: true,
            css_classes: ['property']
        })
        lightBackgroundGroup.add(lightHashRow)

        const lightLastChangeRow = new Adw.ActionRow({
            title: lastChangeTitle,
            subtitle_selectable: true,
            css_classes: ['property']
        })
        lightBackgroundGroup.add(lightLastChangeRow)

        const lightDominantAccent = new Adw.ActionRow({
            title: dominantAccentTitle,
            css_classes: ['property']
        })
        lightBackgroundGroup.add(lightDominantAccent)

        const lightHighlightAccent = new Adw.ActionRow({
            title: highlightAccentTitle,
            css_classes: ['property']
        })
        lightBackgroundGroup.add(lightHighlightAccent)

        // Dark background

        const darkBackgroundDeleteBtn = createDeleteButton()

        const darkBackgroundGroup = new Adw.PreferencesGroup({
            title: _('Dark Background'),
            header_suffix: darkBackgroundDeleteBtn
        })
        cachePage.add(darkBackgroundGroup)

        const darkNoCacheRow = new Adw.ActionRow({
            title: noCacheMsg
        })
        darkBackgroundGroup.add(darkNoCacheRow)

        const darkHashRow = new Adw.ActionRow({
            title: hashTitle,
            subtitle_selectable: true,
            css_classes: ['property']
        })
        darkBackgroundGroup.add(darkHashRow)

        const darkLastChangeRow = new Adw.ActionRow({
            title: lastChangeTitle,
            subtitle_selectable: true,
            css_classes: ['property']
        })
        darkBackgroundGroup.add(darkLastChangeRow)

        const darkDominantAccent = new Adw.ActionRow({
            title: dominantAccentTitle,
            css_classes: ['property']
        })
        darkBackgroundGroup.add(darkDominantAccent)

        const darkHighlightAccent = new Adw.ActionRow({
            title: highlightAccentTitle,
            css_classes: ['property']
        })
        darkBackgroundGroup.add(darkHighlightAccent)

        ////////////////////////////////////////////////////////////////////////

        // About page //////////////////////////////////////////////////////////

        const aboutPage = new Adw.PreferencesPage({
            title: _('About'),
            icon_name: 'help-about-symbolic'
        })
        window.add(aboutPage)

        const aboutGroup = new Adw.PreferencesGroup()
        aboutPage.add(aboutGroup)

        const title = new Gtk.Label({
            label: _('Auto Accent Colour'),
            css_classes: ['title-1']
        })
        aboutGroup.add(title)

        const author = new Gtk.Label({
            label: _('Created by %s and contributors').format('Wartybix')
        })
        aboutGroup.add(author)

        const versionNo = this.metadata.version || 0

        const versionLabel = new Gtk.Label({
            label: _('Version %d').format(versionNo),
            css_classes: ['title-4'],
            margin_top: 8
        })
        aboutGroup.add(versionLabel)

        const specialThanks = new Adw.PreferencesGroup({
            title: _('Special Thanks')
        })
        aboutPage.add(specialThanks)

        const lokeshRow = new Adw.ActionRow({
            title: 'Lokesh Dhakar',
            subtitle: _('For creating the ColorThief JavaScript module, used for extracting colours from the background image')
        })
        specialThanks.add(lokeshRow)

        const olivierlesnickiRow = new Adw.ActionRow({
            title: 'Olivier Lesnicki',
            subtitle: _('For creating the Quantize JavaScript module, used by ColorThief for colour quantization')
        })
        specialThanks.add(olivierlesnickiRow)

        const linksGroup = new Adw.PreferencesGroup({})
        aboutPage.add(linksGroup)

        const repoBtn = new Gtk.LinkButton({
            label: 'GitHub',
            valign: Gtk.Align.CENTER,
            uri: 'https://github.com/Wartybix/GNOME-Auto-Accent-Colour/'
        })

        const repoRow = new Adw.ActionRow({
            title: _('Project Repository'),
            activatable_widget: repoBtn
        })
        linksGroup.add(repoRow)
        repoRow.add_suffix(repoBtn)

        const repoIcon = getIcon('code-symbolic')
        repoRow.add_prefix(repoIcon)

        const issueBtn = new Gtk.LinkButton({
            label: 'GitHub',
            valign: Gtk.Align.CENTER,
            uri: 'https://github.com/Wartybix/GNOME-Auto-Accent-Colour/issues'
        })

        const issueRow = new Adw.ActionRow({
            title: _('Submit an Issue'),
            activatable_widget: issueBtn
        })
        linksGroup.add(issueRow)
        issueRow.add_suffix(issueBtn)

        const issueIcon = getIcon('bug-symbolic')
        issueRow.add_prefix(issueIcon)

        const contributorsBtn = new Gtk.LinkButton({
            label: 'GitHub',
            valign: Gtk.Align.CENTER,
            uri: 'https://github.com/Wartybix/GNOME-Auto-Accent-Colour/graphs/contributors'
        })

        const contributorsRow = new Adw.ActionRow({
            title: _('Contributors'),
            activatable_widget: contributorsBtn
        })
        linksGroup.add(contributorsRow)
        contributorsRow.add_suffix(contributorsBtn)

        const contributorsIcon = Gtk.Image.new_from_icon_name(
            'system-users-symbolic'
        )
        contributorsRow.add_prefix(contributorsIcon)

        const licensesRow = new Adw.ExpanderRow({
            title: _('Licenses')
        })
        linksGroup.add(licensesRow)

        const licenseIcon = getIcon('license-symbolic')
        licensesRow.add_prefix(licenseIcon)

        const gplv3Btn = new Gtk.LinkButton({
            label: 'GitHub',
            valign: Gtk.Align.CENTER,
            uri: 'https://github.com/Wartybix/GNOME-Auto-Accent-Colour/blob/main/LICENSE'
        })

        const autoAccentColourRow = new Adw.ActionRow({
            title: _('Auto Accent Colour Extension'),
            subtitle: _('GNU General Public License v3.0'),
            activatable_widget: gplv3Btn,
            css_classes: ['property']
        })
        autoAccentColourRow.add_suffix(gplv3Btn)
        licensesRow.add_row(autoAccentColourRow)

        const colorThiefLicenseBtn = new Gtk.LinkButton({
            label: 'GitHub',
            valign: Gtk.Align.CENTER,
            uri: 'https://github.com/lokesh/color-thief/blob/master/LICENSE'
        })

        const colorThiefRow = new Adw.ActionRow({
            title: _('ColorThief Module'),
            subtitle: _('MIT License'),
            activatable_widget: colorThiefLicenseBtn,
            css_classes: ['property']
        })
        colorThiefRow.add_suffix(colorThiefLicenseBtn)
        licensesRow.add_row(colorThiefRow)

        const quantizeLicenseBtn = new Gtk.LinkButton({
            label: 'GitHub',
            valign: Gtk.Align.CENTER,
            uri: 'https://github.com/olivierlesnicki/quantize/blob/master/LICENSE'
        })

        const quantizeRow = new Adw.ActionRow({
            title: _('Quantize Module'),
            subtitle: _('MIT License'),
            activatable_widget: quantizeLicenseBtn,
            css_classes: ['property']
        })
        quantizeRow.add_suffix(quantizeLicenseBtn)
        licensesRow.add_row(quantizeRow)

        const pigeonsGroup = new Adw.PreferencesGroup()
        aboutPage.add(pigeonsGroup)

        const pigeonsText = new Gtk.Label({
            label: _('Be kind to your local pigeons!')
        })
        pigeonsGroup.add(pigeonsText)

        ////////////////////////////////////////////////////////////////////////

        const magickTickIcon = Gtk.Image.new_from_icon_name('emblem-ok-symbolic')
        const magickWarningIcon = Gtk.Image.new_from_icon_name('dialog-warning-symbolic')
        const rsvgTickIcon = Gtk.Image.new_from_icon_name('emblem-ok-symbolic')
        const rsvgWarningIcon = Gtk.Image.new_from_icon_name('dialog-warning-symbolic')
        const notNeededLabel = new Gtk.Label({ label: _('Not Needed') })

        let currentMagickIcon = magickTickIcon
        let currentRsvgSuffix = rsvgTickIcon

        function setDependencyRows() {
            const magickInstalled = isImageMagickInstalled()

            const magickLabel = magickInstalled ? _('Installed') : _('Not Installed')

            imageMagickRow.subtitle = magickLabel

            imageMagickRow.remove(currentMagickIcon)
            currentMagickIcon = magickInstalled ? magickTickIcon : magickWarningIcon
            imageMagickRow.add_suffix(currentMagickIcon)


            const rsvgConvertAvailable = isRsvgConvertAvailable()

            const rsvgAvailableText = rsvgConvertAvailable
                ? _('Available')
                : _('Unavailable')

            rsvgConvertRow.subtitle = rsvgAvailableText

            rsvgConvertRow.remove(currentRsvgSuffix)

            if (magickInstalled) {
                currentRsvgSuffix = notNeededLabel
            } else {
                currentRsvgSuffix = rsvgConvertAvailable ? rsvgTickIcon : rsvgWarningIcon
            }

            rsvgConvertRow.add_suffix(currentRsvgSuffix)
        }

        setDependencyRows()

        refreshButton.connect('clicked', () => { setDependencyRows() })

        window._settings.bind(
            'hide-indicator',
            indicatorRow,
            'active',
            Gio.SettingsBindFlags.DEFAULT
        )

        window._settings.bind(
            'highlight-mode',
            dominantColourRadio,
            'active',
            Gio.SettingsBindFlags.INVERT_BOOLEAN
        )

        window._settings.bind(
            'highlight-mode',
            highlightColourRadio,
            'active',
            Gio.SettingsBindFlags.DEFAULT
        )

        window._settings.bind(
            'debug-logging',
            debugLoggingRow,
            'active',
            Gio.SettingsBindFlags.DEFAULT
        )
        window._settings.bind(
            'keep-conversion',
            keepConversionRow,
            'active',
            Gio.SettingsBindFlags.DEFAULT
        )
        window._settings.bind(
            'ignore-caches',
            ignoreCachesRow,
            'active',
            Gio.SettingsBindFlags.DEFAULT
        )

        dominantColourRadio.connect('activate', () => {
            settings.set_boolean('highlight-mode', false)
        })

        highlightColourRadio.connect('activate', () => {
            settings.set_boolean('highlight-mode', true)
        })

        const accentNames = [
            _('Blue'),
            _('Teal'),
            _('Green'),
            _('Yellow'),
            pgettext('The colour', 'Orange'),
            _('Red'),
            _('Pink'),
            _('Purple'),
            pgettext('The colour', 'Slate')
        ]

        function clearCache(theme) {
            settings.reset(`${theme}-hash`)
            settings.reset(`${theme}-dominant-accent`)
            settings.reset(`${theme}-highlight-accent`)
        }

        lightBackgroundDeleteBtn.connect('clicked', () => { clearCache('light') })
        darkBackgroundDeleteBtn.connect('clicked', () => { clearCache('dark') })

        /* I would use Gio.Settings.bind_with_mapping to show the values in the
        cache tab, except I have no clue how its 'get_mapping' parameter is
        supposed to work. Instead, this longer, less sophisticated code will
        work in the	meantime:
        (TODO for the future -- change to bind_with_mapping calls once
        documentation either elaborates further or I see something that actually
        explains how this thing works) */

        function getCachedAccent(theme, colourType) {
            const index = settings.get_enum(`${theme}-${colourType}-accent`)
            const accentName = accentNames[index]

            return accentName.toString()
        }

        function setHashRow(theme) {
            const lightTheme = theme === LIGHT

            const noCacheRow = lightTheme ? lightNoCacheRow : darkNoCacheRow
            const deleteBtn = lightTheme ? lightBackgroundDeleteBtn : darkBackgroundDeleteBtn
            const hashRow = lightTheme ? lightHashRow : darkHashRow
            const lastChangeRow = lightTheme ? lightLastChangeRow : darkLastChangeRow
            const dominantRow = lightTheme ? lightDominantAccent : darkDominantAccent
            const highlightRow = lightTheme ? lightHighlightAccent : darkHighlightAccent
            const hash = settings.get_int64(`${theme}-hash`)
            const isHashDefault = hash === -1

            noCacheRow.visible = isHashDefault
            deleteBtn.sensitive = !isHashDefault
            hashRow.visible = !isHashDefault
            lastChangeRow.visible = !isHashDefault
            dominantRow.visible = !isHashDefault
            highlightRow.visible = !isHashDefault

            hashRow.subtitle = hash.toString()
        }

        function setLastChangeRow(theme) {
            const lastChangeHash = settings.get_int64(`${theme}-last-change`)

            const lastChangeRow = theme === LIGHT
                ? lightLastChangeRow
                : darkLastChangeRow

            lastChangeRow.subtitle = lastChangeHash.toString()
        }

        function setAccentRow(theme, colourType) {
            const [dominantAccent, highlightAccent] = theme === LIGHT
                ? [lightDominantAccent, lightHighlightAccent]
                : [darkDominantAccent, darkHighlightAccent]
            const row = colourType === DOMINANT ? dominantAccent : highlightAccent
            row.subtitle = getCachedAccent(theme, colourType)
        }

        for (let theme of [LIGHT, DARK]) {
            setHashRow(theme)
            setLastChangeRow(theme)

            window._settings.connect(
                `changed::${theme}-hash`,
                () => { setHashRow(theme) }
            )

            window._settings.connect(
                `changed::${theme}-last-change`,
                () => { setLastChangeRow(theme) }
            )

            for (let colourType of [DOMINANT, HIGHLIGHT]) {
                setAccentRow(theme, colourType)

                window._settings.connect(
                    `changed::${theme}-${colourType}-accent`,
                    () => { setAccentRow(theme, colourType) }
                )
            }
        }
    }
}



