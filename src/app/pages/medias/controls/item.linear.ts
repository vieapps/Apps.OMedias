import { Component, Input } from "@angular/core";
import { registerLocaleData } from "@angular/common";
import { ConfigurationService } from "../../../services/configuration.service";
import { Media } from "../../../models/media";
import { MediaHomeScreenControl } from "./home";

@Component({
	selector: "control-media-linear-item",
	templateUrl: "./item.linear.html",
	styleUrls: ["./item.linear.scss"]
})

export class MediaLinearItemControl {

	constructor (
		public configSvc: ConfigurationService
	) {
		this.configSvc.locales.forEach(locale => registerLocaleData(this.configSvc.getLocaleData(locale)));
	}

	@Input() media: Media;

	get locale() {
		return this.configSvc.locale;
	}

	async openAsync() {
		await this.configSvc.navigateForwardAsync(MediaHomeScreenControl.getMediaUrl(this.media));
	}
}
