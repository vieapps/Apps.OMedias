import { Component, OnInit, OnDestroy, ViewChild, NgZone } from "@angular/core";
import { IonTabs } from "@ionic/angular";
import { AppEvents } from "../components/app.events";
import { AppUtility } from "../components/app.utility";
import { ConfigurationService } from "../services/configuration.service";

@Component({
	selector: "page-tabs",
	templateUrl: "./tabs.page.html",
	styleUrls: ["./tabs.page.scss"]
})
export class TabsPage implements OnInit, OnDestroy {

	constructor(
		public zone: NgZone,
		public configSvc: ConfigurationService
	) {
	}

	@ViewChild(IonTabs) tabsCtrl: IonTabs;

	labels = {
		channels: "Channels",
		medias: "Broadcasted",
		all: ""
	};

	ngOnInit() {
		AppEvents.on("App", info => {
			if ("Initialized" === info.args.Type || "LanguageChanged" === info.args.Type) {
				this.zone.run(async () => {
					this.labels = {
						channels: await this.configSvc.getResourceAsync("omedias.tabs.channels.label"),
						medias: await this.configSvc.getResourceAsync("omedias.tabs.medias.label"),
						all: await this.configSvc.getResourceAsync("omedias.tabs.all.label")
					};
				});
			}
		}, "AppEventHandlerOfTabsPage");
		AppEvents.on("SelectTab", info => {
			if (AppUtility.isNotEmpty(info.args.Tab) && info.args.Tab !== this.tabsCtrl.getSelected()) {
				this.tabsCtrl.select(info.args.Tab);
			}
			if (info.args.OnNext !== undefined && typeof info.args.OnNext === "function") {
				info.args.OnNext();
			}
		}, "SelectTabEventHandlerOfTabsPage");
	}

	ngOnDestroy() {
		AppEvents.off("App", "AppEventHandlerOfTabsPage");
		AppEvents.off("SelectTab", "SelectTabEventHandlerOfTabsPage");
	}

	onTabsDidChange($event: any) {
		this.configSvc.appConfig.url.tabs.previous = this.configSvc.appConfig.url.tabs.current;
		this.configSvc.appConfig.url.tabs.current = $event.tab;
		AppEvents.broadcast("TabChanged", this.configSvc.appConfig.url.tabs);
	}

}
