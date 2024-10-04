import Gio from 'gi://Gio'
import Adw from 'gi://Adw'
import {ExtensionPreferences, gettext as _} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js'

export default class AutoAccentColourPreferences extends ExtensionPreferences {
	fillPreferencesWindow(window) {
		const dependenciesPage = new Adw.PreferencesPage({
			title: _('Dependencies'),
			icon_name: _('dialog-information-symbolic') // TODO: Change these icons
		})
		window.add(dependenciesPage)

		const appearancePage = new Adw.PreferencesPage({
			title: _('General'),
			icon_name: _('dialog-information-symbolic')
		})
		window.add(appearancePage)

		const group = new Adw.PreferencesGroup({
			title: _('Appearance')
		})
		appearancePage.add(group)

		const row = new Adw.SwitchRow({
			title: _('Hide Indicator'),
			subtitle: _('Dependency alerts will always be shown')
		})
		group.add(row)

		window._settings = this.getSettings()
		window._settings.bind(
			'hide-indicator',
			row,
			'active',
			Gio.SettingsBindFlags.DEFAULT
		)
	}
}

