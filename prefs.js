import Gio from 'gi://Gio'
import Adw from 'gi://Adw'
import Gtk from 'gi://Gtk'
import {ExtensionPreferences, gettext as _} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js'

export default class AutoAccentColourPreferences extends ExtensionPreferences {
	fillPreferencesWindow(window) {
		// Dependencies page ///////////////////////////////////////////////////

		const dependenciesPage = new Adw.PreferencesPage({
			title: _('Setup'),
			icon_name: _('package-x-generic-symbolic')
		})
		window.add(dependenciesPage)

		const dependenciesDescriptionGroup = new Adw.PreferencesGroup({
			description: _('This extension requires some external depenecies to parse colours from the desktop background')
		})
		dependenciesPage.add(dependenciesDescriptionGroup)

		const localDependenciesGroup = new Adw.PreferencesGroup({
			title: _('Local Dependencies'),
			description: _('Dependencies listed here are installed to the extension\'s local directory')
		})
		dependenciesPage.add(localDependenciesGroup)

		const colorThiefRow = new Adw.ActionRow({
			title: _('ColorThief Module'),
			subtitle: _('Python library for extracting colours from images')
		})
		localDependenciesGroup.add(colorThiefRow)

		const installButton = new Gtk.Button({
			label: _('Install'),
			valign: Gtk.Align.CENTER
		})
		colorThiefRow.add_suffix(installButton)


		const systemDependenciesGroup = new Adw.PreferencesGroup({
			title: _('System Dependencies'),
			description: _('Dependencies listed here must be installed via the system\'s package manager')
		})
		dependenciesPage.add(systemDependenciesGroup)

		const pythonRow = new Adw.ActionRow({
			title: _('Python'),
			subtitle: _('To run ColorThief script on background image')
		})
		systemDependenciesGroup.add(pythonRow)

		const imageMagickRow = new Adw.ActionRow({
			title: _('ImageMagick'),
			subtitle: _('To convert SVG and JXL backgrounds to a suitable format for parsing')
		})
		systemDependenciesGroup.add(imageMagickRow)



		////////////////////////////////////////////////////////////////////////

		// Settings page ///////////////////////////////////////////////////////

		const settingsPage = new Adw.PreferencesPage({
			title: _('Settings'),
			icon_name: _('org.gnome.Settings-symbolic')
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

		////////////////////////////////////////////////////////////////////////

		// Cache page //////////////////////////////////////////////////////////

		const cachePage = new Adw.PreferencesPage({
			title: _('Cache'),
			icon_name: _('drive-harddisk-symbolic')
		})
		window.add(cachePage)

		////////////////////////////////////////////////////////////////////////

		// About page //////////////////////////////////////////////////////////

		const aboutPage = new Adw.PreferencesPage({
			title: _('About'),
			icon_name: _('user-info-symbolic')
		})
		window.add(aboutPage)

		////////////////////////////////////////////////////////////////////////

		window._settings = this.getSettings()
		window._settings.bind(
			'hide-indicator',
			indicatorRow,
			'active',
			Gio.SettingsBindFlags.DEFAULT
		)
	}
}

