import { Component, OnInit, OnDestroy, OnChanges, Input } from "@angular/core";
import { Router } from "@angular/router";
import { registerLocaleData } from "@angular/common";
import { AppConfig } from "../../../app.config";
import { AppEvents } from "../../../components/app.events";
import { AppUtility } from "../../../components/app.utility";
import { PlatformUtility } from "../../../components/app.utility.platform";
import { ConfigurationService } from "../../../services/configuration.service";
import { MediasService } from "../../../services/medias.service";
import { Category, Group, Media } from "../../../models/media";

@Component({
	selector: "control-media-home-screen",
	templateUrl: "./home.html",
	styleUrls: ["./home.scss"]
})

export class MediaHomeScreenControl implements OnInit, OnDestroy, OnChanges {

	static get tabName() {
		return "medias";
	}

	static get urlPrefix() {
		return this.getUrlPrefix();
	}

	static getUrlPrefix(tabName?: string) {
		return this.tabName !== undefined ? `${AppConfig.url.home}/${tabName || this.tabName}` : "/medias";
	}

	static getCategoryUrl(category: Category, tabName?: string, title?: string) {
		return category.getLink(this.getUrlPrefix(tabName)) + "?x-request=" + category.getQueryParams(tabName || this.tabName, title);
	}

	static getMediaUrl(media: Media, tabName?: string) {
		return media.getLink(this.getUrlPrefix(tabName)) + "?x-request=" + media.getQueryParams(tabName || this.tabName);
	}

	constructor (
		public router: Router,
		public configSvc: ConfigurationService,
		public mediasSvc: MediasService
	) {
		this.configSvc.locales.forEach(locale => registerLocaleData(this.configSvc.getLocaleData(locale)));
	}

	@Input() changes: any;

	groups = this.mediasSvc.groups;

	get locale() {
		return this.configSvc.locale;
	}

	ngOnInit() {
		AppEvents.broadcast("SetHomepageTitleResource", { ResourceID: "omedias.tabs.channels.title" });

		AppEvents.on(this.mediasSvc.name, info => {
			if ("GroupsUpdated" === info.args.Type) {
				this.groups = this.mediasSvc.groups;
			}
		}, "GroupsUpdatedEventHandlerOfMediaHomeScreen");
	}

	ngOnDestroy() {
		AppEvents.off("GroupsUpdated", "GroupsUpdatedEventHandlerOfMediaHomeScreen");
	}

	ngOnChanges() {
		if (this.configSvc.isReady) {
		}
	}

	trackItem(index: number, item: any) {
		return `${item.name}@${index}`;
	}

	openItem(group: Group, category: Category) {
		const url = MediaHomeScreenControl.getCategoryUrl(category, MediaHomeScreenControl.tabName ? "channels" : undefined, category.name.startsWith(group.name) ? undefined : group.name + " > " + category.name);
		this.configSvc.navigateForwardAsync(url);
	}

}
