import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { IonicModule } from "@ionic/angular";
import { AppFormsModule } from "../../components/forms.module";
import { MediaHomeScreenControl } from "./controls/home";
import { MediaLinearItemControl } from "./controls/item.linear";
import { MediaGridItemControl } from "./controls/item.grid";
import { MediaHeaderButtonsControl } from "./controls/header.buttons";

@NgModule({
	imports: [
		CommonModule,
		IonicModule,
		AppFormsModule
	],
	exports: [
		MediaHomeScreenControl,
		MediaLinearItemControl,
		MediaGridItemControl,
		MediaHeaderButtonsControl
	],
	declarations: [
		MediaHomeScreenControl,
		MediaLinearItemControl,
		MediaGridItemControl,
		MediaHeaderButtonsControl
	]
})

export class MediaControlsModule {}
