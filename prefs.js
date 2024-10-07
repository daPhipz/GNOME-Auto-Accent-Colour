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

// TODO: Remove duplicate code
async function isColorThiefInstalled(extensionPath) {
	try {
		const pythonExists = GLib.file_test(
			extensionPath + '/venv/bin/python',
			GLib.FileTest.EXISTS
		)
		console.log('Python exists: ' + pythonExists)
		if (!pythonExists) { return false }

		const colorThiefExists = Boolean(
			await execCommand([
					extensionPath + '/venv/bin/python',
					extensionPath + '/tools/is-colorthief-installed.py'
			])
		)
		console.log('ColorThief exists: ' + colorThiefExists)
		return colorThiefExists
	} catch (e) {
		logError(e)
	}
}

async function downloadColorThief(extensionPath, onFinish) {
	console.log('Downloading ColorThief to ' + extensionPath + '...')
	await execCommand(['python', '-m', 'venv', extensionPath + '/venv/'])
	await execCommand([extensionPath + '/venv/bin/pip', 'install', 'colorthief'])
	onFinish()
}

async function refreshLocalDependencies(
	extensionPath,
	colorThiefRow,
	spinner,
	installButton,
	installedLabel
) {
	const colorThiefInstalled = await isColorThiefInstalled(extensionPath)
	colorThiefRow.remove(spinner)

	if (colorThiefInstalled) {
		colorThiefRow.add_suffix(installedLabel)
	} else {
		colorThiefRow.add_suffix(installButton)
	}
}

export default class AutoAccentColourPreferences extends ExtensionPreferences {
	fillPreferencesWindow(window) {
		// Dependencies page ///////////////////////////////////////////////////

		const dependenciesPage = new Adw.PreferencesPage({
			title: _('Setup'),
			icon_name: _('package-x-generic-symbolic')
		})
		window.add(dependenciesPage)

		const dependenciesDescriptionGroup = new Adw.PreferencesGroup({
			description: _('This extension requires some external dependencies to parse colours from the desktop background')
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

		const pypiButton = new Gtk.LinkButton({
			label: _('About'),
			valign: Gtk.Align.CENTER,
			uri: 'https://pypi.org/project/colorthief/'
		})
		colorThiefRow.add_suffix(pypiButton)

		const installButton = new Gtk.Button({
			label: _('Install'),
			valign: Gtk.Align.CENTER,
			css_classes: ['suggested-action']
		})

		const colorThiefSpinner = new Adw.Spinner()
		colorThiefRow.add_suffix(colorThiefSpinner)

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

		const pythonSpinner = new Adw.Spinner()
		pythonRow.add_suffix(pythonSpinner)

		const imageMagickRow = new Adw.ActionRow({
			title: _('ImageMagick'),
			subtitle: _('To convert SVG and JXL backgrounds to a suitable format for parsing')
		})
		systemDependenciesGroup.add(imageMagickRow)

		const imageMagickSpinner = new Adw.Spinner()
		imageMagickRow.add_suffix(imageMagickSpinner)

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

		const extensionPath = this.path
		const installedLabel = new Gtk.Label({ label: _('Installed') })

		function refreshLocal() {
			refreshLocalDependencies(
				extensionPath,
				colorThiefRow,
				colorThiefSpinner,
				installButton,
				installedLabel
			)
		}

		refreshLocal()

		installButton.connect('clicked', () => {
			colorThiefRow.remove(installButton)
			colorThiefRow.add_suffix(spinner)

			downloadColorThief(
				this.path,
				function() {
					refreshLocal()
				}
			)
		})

		window._settings = this.getSettings()

		window._settings.bind(
			'hide-indicator',
			indicatorRow,
			'active',
			Gio.SettingsBindFlags.DEFAULT
		)
	}
}


