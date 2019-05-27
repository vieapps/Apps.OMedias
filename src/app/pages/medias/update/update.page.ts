import { Subscription } from "rxjs";
import { Component, OnInit, OnDestroy, NgZone } from "@angular/core";
import { FormGroup } from "@angular/forms";
import { registerLocaleData } from "@angular/common";
import { AppXHR } from "../../../components/app.apis";
import { AppCrypto } from "../../../components/app.crypto";
import { AppUtility } from "../../../components/app.utility";
import { TrackingUtility } from "../../../components/app.utility.trackings";
import { AppFormsControl, AppFormsService } from "../../../components/forms.service";
import { ConfigurationService } from "../../../services/configuration.service";
import { AuthenticationService } from "../../../services/authentication.service";
import { MediasService } from "../../../services/medias.service";
import { FilesService, FilesHeader } from "../../../services/files.service";
import { Media } from "../../../models/media";
import { MediaHomeScreenControl } from "../controls/home";

@Component({
	selector: "page-medias-update",
	templateUrl: "./update.page.html",
	styleUrls: ["./update.page.scss"]
})

export class MediasUpdatePage implements OnInit, OnDestroy {

	constructor (
		public zone: NgZone,
		public appFormsSvc: AppFormsService,
		public configSvc: ConfigurationService,
		public authSvc: AuthenticationService,
		public filesSvc: FilesService,
		public mediasSvc: MediasService
	) {
		this.configSvc.locales.forEach(locale => registerLocaleData(this.configSvc.getLocaleData(locale)));
	}

	title = "Update";
	buttons = {
		ok: undefined as {
			text: string,
			icon: string,
			handler: () => void
		},
		cancel: undefined as {
			text: string,
			icon: string,
			handler: () => void
		},
		delete: undefined as {
			text: string,
			icon: string,
			handler: () => void
		}
	};
	id: string;
	media: Media;
	form = new FormGroup({});
	controls = new Array<AppFormsControl>();
	config: Array<any>;
	hash: string;
	status: string;
	mediaFile = {
		file: undefined as File,
		name: undefined as string,
		size: undefined as number,
		meta: undefined as any,
		subscription: undefined as Subscription,
		label: "Media to upload"
	};
	thumbnailImage = {
		uri: undefined as string,
		image: undefined as string,
		name: undefined as string,
		size: undefined as number,
		meta: undefined as any,
		label: "Thummnail",
		labels: {
			current: "Current",
			new: "New"
		}
	};

	get locale() {
		return this.configSvc.locale;
	}

	ngOnInit() {
		this.initializeAsync();
	}

	ngOnDestroy() {
		if (this.mediaFile.subscription !== undefined) {
			this.mediaFile.subscription.unsubscribe();
			this.mediaFile.subscription = undefined;
		}
	}

	initializeAsync() {
		this.id = this.configSvc.requestParams["ID"];
		if (AppUtility.isNotEmpty(this.id)) {
			return this.mediasSvc.getAsync(
				this.id,
				async () => {
					this.media = Media.get(this.id);
					await this.initializeFormAsync();
				},
				async error => await this.appFormsSvc.showErrorAsync(error)
			);
		}
		else {
			this.media = new Media();
			this.media.Categories = this.configSvc.requestParams["Category"] || this.mediasSvc.categories[0].name;
			this.media.EndingTime = undefined;
			this.media.Status = "Pending";
			return this.initializeFormAsync();
		}
	}

	async initializeFormAsync() {
		this.title = this.id !== undefined
			? await this.configSvc.getResourceAsync("omedias.title.update")
			: await this.configSvc.getResourceAsync("omedias.title.create");
		this.configSvc.appTitle = this.title;

		this.mediaFile.label = await this.configSvc.getResourceAsync("omedias.controls.Media.label");
		this.thumbnailImage.label = await this.configSvc.getResourceAsync("omedias.controls.Thumbnail.label");
		this.thumbnailImage.labels = {
			current: await this.configSvc.getResourceAsync("omedias.controls.Thumbnail.labels.current"),
			new: await this.configSvc.getResourceAsync("omedias.controls.Thumbnail.labels.new")
		};

		this.buttons.ok = {
			text: this.id === undefined ? await this.configSvc.getResourceAsync("common.buttons.save") :  await this.configSvc.getResourceAsync("common.buttons.update"),
			icon: undefined,
			handler: async () => await this.saveAsync()
		};

		this.buttons.cancel = {
			text: await this.configSvc.getResourceAsync("common.buttons.cancel"),
			icon: undefined,
			handler: async () => await this.appFormsSvc.showAlertAsync(
				await this.configSvc.getResourceAsync("common.alert.header.general"),
				undefined,
				await this.configSvc.getResourceAsync("omedias.messages.update.confirm"),
				async () => await this.closeAsync(),
				await this.configSvc.getResourceAsync("common.buttons.ok"),
				await this.configSvc.getResourceAsync("common.buttons.cancel")
			)
		};

		const config = await this.configSvc.getDefinitionAsync(this.mediasSvc.name.toLowerCase(), "content", "forms") as Array<any>;
		config.find(ctrl => ctrl.Name === "Categories").Options.SelectOptions.RemoteURIProcessor = async (uri: string) => {
			const path = uri.replace(this.configSvc.appConfig.URIs.apis, "");
			let categories = this.configSvc.getDefinition(path) as Array<{ Value: string, Label: string }>;
			if (categories === undefined) {
				const response = await AppXHR.sendRequestAsync("GET", uri);
				categories = (response as Array<any>).map(data => {
					return { Value: data.name, Label: data.name };
				});
				this.configSvc.addDefinition(categories, path);
			}
			return categories;
		};

		this.config = config;
	}

	onFormInitialized() {
		this.form.patchValue(this.media);
		this.form.controls["Categories"].setValue(AppUtility.toArray(this.media.Categories));
		this.form.controls["StartingTime"].setValue(AppUtility.toIsoDateTime(this.media.StartingTime));
		this.hash = AppCrypto.hash(this.form.value);
	}

	prepareMediaFile($event: any) {
		this.mediaFile.file = $event.target.files.length > 0 ? $event.target.files[0] : undefined;
		if (this.mediaFile.file !== undefined) {
			this.mediaFile.name = this.mediaFile.file.name;
			this.mediaFile.size = Math.round(this.mediaFile.file.size / (1024 * 1024));
			this.form.controls["MediaURI"].disable();
		}
		else {
			this.mediaFile.file = this.mediaFile.size = this.mediaFile.name = undefined;
			this.form.controls["MediaURI"].enable();
		}
	}

	removeMediaFile() {
		this.mediaFile.file = this.mediaFile.size = this.mediaFile.name = undefined;
		this.form.controls["MediaURI"].enable();
	}

	prepareThumbnailImage($event: any) {
		const file: File = $event.target.files.length > 0 ? $event.target.files[0] : undefined;
		if (file !== undefined && file.type.startsWith("image/")) {
			this.filesSvc.readAsDataURL(
				file,
				data => {
					this.thumbnailImage.image = data;
					this.thumbnailImage.name = file.name;
					this.thumbnailImage.size = Math.round(file.size / 1024);
				},
				512 * 1024,
				async () => {
					this.thumbnailImage.image = this.thumbnailImage.name = undefined;
					await this.appFormsSvc.showToastAsync("Too big...");
				}
			);
		}
		else {
			this.thumbnailImage.image = this.thumbnailImage.name = undefined;
		}
	}

	async saveAsync() {
		if (this.form.invalid) {
			this.appFormsSvc.highlightInvalids(this.form);
		}
		else if (this.hash === AppCrypto.hash(this.form.value)) {
			await this.closeAsync();
		}
		else {
			if (this.mediaFile.file === undefined && !AppUtility.isNotEmpty(this.form.value.mediaURI) && !AppUtility.isNotEmpty(this.form.value.Details)) {
				this.controls.find(control => control.Name === "MediaURI").focus();
			}
			else {
				await this.appFormsSvc.showLoadingAsync(this.title + "...");
				if (this.id === undefined) {
					await this.createAsync(async () => await this.closeAsync());
				}
				else {
					await this.updateAsync(async () => await this.closeAsync());
				}
			}
		}
	}

	private async saveMediaURIAsync(mediaURI: string, onNext?: (data?: any) => void) {
		return mediaURI !== undefined
			? this.mediasSvc.updateAsync({ ID: this.media.ID, MediaURI: mediaURI, Status: this.status || this.media.Status }, onNext)
			: new Promise<void>(onNext !== undefined ? () => onNext() : () => {});
	}

	private createAsync(onNext?: (data?: any) => void) {
		let status = "Pending";
		if (this.form.value.Status === "Published") {
			this.status = this.form.value.Status;
		}
		else {
			status = undefined;
		}
		return this.mediasSvc.createAsync(
			Media.clone(this.form.value, status),
			async data => {
				this.media = Media.get(data.ID);
				this.id = this.media.ID;
				await Promise.all([
					TrackingUtility.trackAsync(this.title + ` [${this.media.Title}]`, "omedias/create/content"),
					this.uploadAsync(async uploaded => await this.saveMediaURIAsync(
						AppUtility.isArray(uploaded, true) ? uploaded[0].URIs.Direct : undefined,
						async updated => {
							await this.appFormsSvc.showToastAsync(await this.configSvc.getResourceAsync("omedias.messages.create.success"));
							if (onNext !== undefined) {
								onNext(updated);
							}
						}
					))
				]);
			},
			async error => await this.appFormsSvc.showErrorAsync(error, await this.configSvc.getResourceAsync("omedias.messages.create.error"))
		);
	}

	private updateAsync(onNext?: (data?: any) => void) {
		return this.mediasSvc.updateAsync(
			Media.clone(this.form.value),
			async data => await Promise.all([
				TrackingUtility.trackAsync(this.title + ` [${this.media.Title}]`, "omedias/update/content"),
				this.uploadAsync(async uploaded => await this.saveMediaURIAsync(
					AppUtility.isArray(uploaded, true) ? uploaded[0].URIs.Direct : undefined,
					async updated => {
						await this.appFormsSvc.showToastAsync(await this.configSvc.getResourceAsync("omedias.messages.update.success"));
						if (onNext !== undefined) {
							onNext(updated);
						}
					}
				))
			]),
			async error => await this.appFormsSvc.showErrorAsync(error, await this.configSvc.getResourceAsync("omedias.messages.update.error"))
		);
	}

	private uploadAsync(onNext?: (data?: any) => void) {
		const header: FilesHeader = {
			ServiceName: this.mediasSvc.name,
			ObjectName: "Content",
			ObjectID: this.media.ID,
			ObjectTitle: this.media.Title
		};
		return this.thumbnailImage.image !== undefined
			? this.filesSvc.uploadThumbnailsAsync(this.thumbnailImage.image, header, () => this.uploadMediaFile(header, onNext), async () => await this.closeAsync(async () => await this.appFormsSvc.hideLoadingAsync()))
			: new Promise<void>(() => this.uploadMediaFile(header, onNext));
	}

	private uploadMediaFile(header: FilesHeader, onNext?: (data?: any) => void) {
		if (this.mediaFile.file !== undefined) {
			this.mediaFile.subscription = this.filesSvc.uploadFiles(this.filesSvc.getMultipartBody([this.mediaFile.file]), header, onNext, async () => await this.closeAsync(() => this.appFormsSvc.hideLoadingAsync()));
		}
		else if (onNext !== undefined) {
			onNext();
		}
	}

	closeAsync(preProcess?: () => void) {
		return this.appFormsSvc.hideLoadingAsync(async () => await this.zone.run(async () => {
			if (preProcess !== undefined) {
				preProcess();
			}
			await this.configSvc.navigateBackAsync(this.id !== undefined ? this.configSvc.previousUrl : MediaHomeScreenControl.getMediaUrl(this.media));
		}));
	}

}
