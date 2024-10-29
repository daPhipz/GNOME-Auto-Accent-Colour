import Gio from 'gi://Gio'
import Adw from 'gi://Adw'
import Gtk from 'gi://Gtk'
import GLib from 'gi://GLib' //TODO: Remove with duplicated code
import {ExtensionPreferences, gettext as _} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js'

// TODO: Remove duplicate code
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

		const dependenciesDescriptionGroup = new Adw.PreferencesGroup({
			description: _('This extension requires some external dependencies to parse colours from the desktop background')
		})
		dependenciesPage.add(dependenciesDescriptionGroup)

		const systemDependenciesGroup = new Adw.PreferencesGroup({
			title: _('System Dependencies'),
			description: _('Dependencies listed here must be installed via the system\'s package manager')
		})
		dependenciesPage.add(systemDependenciesGroup)

		const imageMagickRow = new Adw.ActionRow({
			title: _('ImageMagick'),
			subtitle: _('To convert SVG and JXL backgrounds to a suitable format for parsing')
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
			title: _('Hide Indicator'),
			subtitle: _('Dependency alerts will always be shown')
		})
		appearanceGroup.add(indicatorRow)

		const paletteGroup = new Adw.PreferencesGroup({
			title: _('Colour Palette'),
			description: _(
				'Choose the type of background colour to base the shell accent \
colour from. The dominant colour may sometimes be the same as the highlight colour.'
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
			subtitle: _('Use a contrasting yet complimentary colour from the background'),
			activatable_widget: highlightColourRadio
		})
		highlightColourRow.add_prefix(highlightColourRadio)
		paletteGroup.add(highlightColourRow)

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

		const hashTitle = _('Hash')
		const dominantAccentTitle = _('Dominant Accent')
		const highlightAccentTitle = _('Highlight Accent')

		// Light background

		const lightBackgroundDeleteBtn = createDeleteButton()

		const lightBackgroundGroup = new Adw.PreferencesGroup({
			title: _('Light Background'),
			header_suffix: lightBackgroundDeleteBtn
		})
		cachePage.add(lightBackgroundGroup)

		let testStr = ''

		const lightHashRow = new Adw.ActionRow({
			title: hashTitle,
			subtitle_selectable: true,
			subtitle: testStr,
			css_classes: ['property']
		})
		lightBackgroundGroup.add(lightHashRow)

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

		const darkHashRow = new Adw.ActionRow({
			title: hashTitle,
			subtitle_selectable: true,
			css_classes: ['property']
		})
		darkBackgroundGroup.add(darkHashRow)

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

		////////////////////////////////////////////////////////////////////////

		const extensionPath = this.path
		const installedLabel = new Gtk.Label({ label: _('Installed') })

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

			console.log('accent name: ' + accentName)
			return accentName.toString()
		}

		function setHashRow(theme) {
			const row = theme == LIGHT ? lightHashRow : darkHashRow
			row.subtitle = settings.get_int64(`${theme}-hash`).toString()
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

			window._settings.connect(
				`changed::${theme}-hash`,
				() => { setHashRow(theme) }
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



