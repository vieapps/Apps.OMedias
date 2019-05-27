import { Component } from "@angular/core";
import { ConfigurationService } from "../../../services/configuration.service";
import { AuthenticationService } from "../../../services/authentication.service";

@Component({
	selector: "control-media-header-buttons",
	templateUrl: "./header.buttons.html",
	styleUrls: ["./header.buttons.scss"]
})

export class MediaHeaderButtonsControl {

	constructor (
		public configSvc: ConfigurationService,
		public authSvc: AuthenticationService
	) {
	}

	async registerAsync() {
		this.configSvc.navigateForwardAsync(this.configSvc.appConfig.url.users.register);
	}

	async loginAsync() {
		this.configSvc.navigateForwardAsync(this.configSvc.appConfig.url.users.login);
	}

	async viewProfileAsync() {
		this.configSvc.navigateForwardAsync(this.configSvc.appConfig.url.users.profile + "/my");
	}

}
