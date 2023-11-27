import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';
import * as encoder from "@tensorflow-models/universal-sentence-encoder"
import "@tensorflow/tfjs"
import { index } from "voy-search"

// Remember to rename these classes and interfaces!

interface SemanticSettings {
	dbPath: string | undefined;
}

const DEFAULT_SETTINGS: SemanticSettings = {
	dbPath: undefined
}

export default class Semantic extends Plugin {
	settings: SemanticSettings;

	async onload() {
		this.app.vault
		await this.loadSettings();

		// This creates an icon in the left ribbon.
		const ribbonIconEl = this.addRibbonIcon('dice', 'Sample Plugin', (evt: MouseEvent) => {
			// Called when the user clicks the icon.
			new Notice('This is a notice!');
		});
		// Perform additional things with the ribbon
		ribbonIconEl.addClass('my-plugin-ribbon-class');

		// This adds a status bar item to the bottom of the app. Does not work on mobile apps.
		const statusBarItemEl = this.addStatusBarItem();
		statusBarItemEl.setText('Status Bar Text');

		// This adds a simple command that can be triggered anywhere
		this.addCommand({
			id: 'open-sample-modal-simple',
			name: 'Open sample modal (simple)',
			callback: () => {
				new SampleModal(this.app).open();
			}
		});
		// This adds an editor command that can perform some operation on the current editor instance
		this.addCommand({
			id: 'sample-editor-command',
			name: 'Sample editor command',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				console.log(editor.getSelection());
				editor.replaceSelection('Sample Editor Command');
			}
		});
		// This adds a complex command that can check whether the current state of the app allows execution of the command
		this.addCommand({
			id: 'open-sample-modal-complex',
			name: 'Open sample modal (complex)',
			checkCallback: (checking: boolean) => {
				// Conditions to check
				const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
				if (markdownView) {
					// If checking is true, we're simply "checking" if the command can be run.
					// If checking is false, then we want to actually perform the operation.
					if (!checking) {
						new SampleModal(this.app).open();
					}

					// This command will only show up in Command Palette when the check function returns true
					return true;
				}
			}
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SampleSettingTab(this.app, this));

		// If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
		// Using this function will automatically remove the event listener when this plugin is disabled.
		this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
			console.log('click', evt);
		});

		// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));
	}

	onunload() {

	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class SampleModal extends Modal {
	constructor(app: App) {
		super(app);
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.setText('Woah!');
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}

class SampleSettingTab extends PluginSettingTab {
	plugin: Semantic;

	constructor(app: App, plugin: Semantic) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName("Process Files")
			.setDesc("this might take a while")
			.addButton((button) => {
				button.setButtonText("Run").onClick(async () => {
					await this.processFiles()
				})
			})
	}

	processFiles = async () => {

		const files = this.app.vault.getMarkdownFiles()
		const docs = await Promise.all(files.map(async f => await this.app.vault.cachedRead(f)))
		const embedder = await encoder.load()
		const embeddings = await (await embedder.embed(docs)).array()

		const idx = index({
			embeddings: await Promise.all(embeddings.map(
				async (e, i) => {
					await this.app.fileManager.processFrontMatter(
						files[i],
						(front) => {
							front["vec_idx"] = i
						}
					)
					return {
						id: i.toString(),
						title: files[i].basename,
						url: files[i].path,
						embeddings: e
					}
				}
			))
		})

		await this.app.vault.create(this.app.vault.getRoot().path += "/.vector_index", idx)
	}
}

