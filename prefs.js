import Gio from 'gi://Gio'
import Adw from 'gi://Adw'
import Gtk from 'gi://Gtk'
import GLib from 'gi://GLib'
import {ExtensionPreferences, gettext as _} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js'
import { isImageMagickInstalled } from './utils.js'

// TODO: Merge into one with extension.js
class AccentColour {
	constructor(label, adwEnumEntry) {
		this.label = label
		this.rgba = Adw.AccentColor.to_rgba(adwEnumEntry)
	}
}

const LIGHT = 'light'
const DARK = 'dark'
const DOMINANT = 'dominant'
const HIGHLIGHT = 'highlight'

export default class AutoAccentColourPreferences extends ExtensionPreferences {
	fillPreferencesWindow(window) {
		window._settings = this.getSettings()
		const settings = window._settings
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
			title: _('System Dependencies'),
			header_suffix: refreshButton,
			description: _(
				'ImageMagick is required to parse colour data from SVG and JXL \
backgrounds. It must be installed via the system package manager.'
			)
		})
		dependenciesPage.add(systemDependenciesGroup)

		const imageMagickRow = new Adw.ActionRow({
			title: _('ImageMagick')
		})
		systemDependenciesGroup.add(imageMagickRow)

		////////////////////////////////////////////////////////////////////////

		// Settings page ///////////////////////////////////////////////////////

		const settingsPage = new Adw.PreferencesPage({
			title: _('Settings'),
			icon_name: 'org.gnome.Settings-symbolic'
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

		////////////////////////////////////////////////////////////////////////

		// Cache page //////////////////////////////////////////////////////////

		const cachePage = new Adw.PreferencesPage({
			title: _('Cache'),
			icon_name: 'drive-harddisk-symbolic'
		})
		window.add(cachePage)

		const cacheDescriptionGroup = new Adw.PreferencesGroup({
			description: _(
				'Information about backgrounds and their derived colours is cached to increase performance'
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
			icon_name: 'user-info-symbolic'
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
			label: _('Created by Wartybix')
		})
		aboutGroup.add(author)

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

		const repoRow = new Adw.ActionRow({
			title: _('Project Repository')
		})
		linksGroup.add(repoRow)

		const issueRow = new Adw.ActionRow({
			title: _('Submit an Issue')
		})
		linksGroup.add(issueRow)

		const licensesRow = new Adw.ActionRow({
			title: _('Licenses')
		})
		linksGroup.add(licensesRow)

		const pigeonsGroup = new Adw.PreferencesGroup()
		aboutPage.add(pigeonsGroup)

		const pigeonsText = new Gtk.Label({
			label: _('Be kind to your local pigeons!')
		})
		pigeonsGroup.add(pigeonsText)

		////////////////////////////////////////////////////////////////////////

		const extensionPath = this.path
		const installedLabel = new Gtk.Label({ label: _('Installed') })

		function setImageMagickRow() {
			const magickInstalled = isImageMagickInstalled()

			const icon = magickInstalled ? 'emblem-ok-symbolic' : 'dialog-warning-symbolic'
			const label = magickInstalled ? _('Installed') : _('Not Installed')
			const css_classes = ['property']

			if (!magickInstalled) {
				css_classes.push('warning')
			}

			imageMagickRow.subtitle = label
			imageMagickRow.icon_name = icon
			imageMagickRow.css_classes = css_classes
		}

		setImageMagickRow()

		refreshButton.connect('clicked', () => { setImageMagickRow() })

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

		dominantColourRadio.connect('activate', () => {
			settings.set_boolean('highlight-mode', false)
		})

		highlightColourRadio.connect('activate', () => {
			settings.set_boolean('highlight-mode', true)
		})

		const accents = [
			new AccentColour(_('Blue'), Adw.AccentColor.BLUE),
			new AccentColour(_('Teal'), Adw.AccentColor.TEAL),
			new AccentColour(_('Green'), Adw.AccentColor.GREEN),
			new AccentColour(_('Yellow'), Adw.AccentColor.YELLOW),
			new AccentColour(_('Orange'), Adw.AccentColor.ORANGE),
			new AccentColour(_('Red'), Adw.AccentColor.RED),
			new AccentColour(_('Pink'), Adw.AccentColor.PINK),
			new AccentColour(_('Purple'), Adw.AccentColor.PURPLE),
			new AccentColour(_('Slate'), Adw.AccentColor.SLATE),
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
			const accentName = accents[index].label

			return accentName.toString()
		}

		function setHashRow(theme) {
			const lightTheme = theme == LIGHT

			const noCacheRow = lightTheme ? lightNoCacheRow : darkNoCacheRow
			const deleteBtn = lightTheme ? lightBackgroundDeleteBtn : darkBackgroundDeleteBtn
			const hashRow = lightTheme ? lightHashRow : darkHashRow
			const lastChangeRow = lightTheme ? lightLastChangeRow : darkLastChangeRow
			const dominantRow = lightTheme ? lightDominantAccent : darkDominantAccent
			const highlightRow = lightTheme ? lightHighlightAccent : darkHighlightAccent
			const hash = settings.get_int64(`${theme}-hash`)
			const isHashDefault = hash == -1

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

			const lastChangeRow = theme == LIGHT
				? lightLastChangeRow
				: darkLastChangeRow

			lastChangeRow.subtitle = lastChangeHash.toString()
		}

		function setAccentRow(theme, colourType) {
			const [dominantAccent, highlightAccent] = theme == LIGHT
				? [lightDominantAccent, lightHighlightAccent]
				: [darkDominantAccent, darkHighlightAccent]
			const row = colourType == DOMINANT ? dominantAccent : highlightAccent
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



