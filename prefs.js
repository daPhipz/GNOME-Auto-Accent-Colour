import Gio from 'gi://Gio'
import Adw from 'gi://Adw'
import {ExtensionPreferences, gettext as _} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js'

export default class AutoAccentColourPreferences extends ExtensionPreferences {
	fillPreferencesWindow(window) {
		// Dependencies page ///////////////////////////////////////////////////

		const dependenciesPage = new Adw.PreferencesPage({
			title: _('Dependencies'),
			icon_name: _('package-x-generic-symbolic')
		})
		window.add(dependenciesPage)

		////////////////////////////////////////////////////////////////////////

		// Settings page ///////////////////////////////////////////////////////

		const settingsPage = new Adw.PreferencesPage({
			title: _('Settings'),
			icon_name: _('org.gnome.Settings-symbolic')
		})
		window.add(settingsPage)

		const group = new Adw.PreferencesGroup({
			title: _('Appearance')
		})
		settingsPage.add(group)

		const row = new Adw.SwitchRow({
			title: _('Hide Indicator'),
			subtitle: _('Dependency alerts will always be shown')
		})
		group.add(row)

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
			row,
			'active',
			Gio.SettingsBindFlags.DEFAULT
		)
	}
}

