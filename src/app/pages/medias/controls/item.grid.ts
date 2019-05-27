import { Component, Input } from "@angular/core";
import { ConfigurationService } from "../../../services/configuration.service";
import { Media } from "../../../models/media";
import { MediaHomeScreenControl } from "./home";

@Component({
	selector: "control-media-grid-item",
	templateUrl: "./item.grid.html",
	styleUrls: ["./item.grid.scss"]
})

export class MediaGridItemControl {

	constructor (
		public configSvc: ConfigurationService
	) {
	}

	@Input() media: Media;

	get coverBackground() {
		return undefined; // `url(${this.media.Cover})`;
	}

	async openAsync() {
		await this.configSvc.navigateForwardAsync(MediaHomeScreenControl.getMediaUrl(this.media));
	}

}
