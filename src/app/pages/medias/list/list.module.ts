import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { RouterModule } from "@angular/router";
import { IonicModule } from "@ionic/angular";
import { MediaControlsModule } from "../controls.module";
import { MediasListPage } from "./list.page";

@NgModule({
	imports: [
		CommonModule,
		IonicModule,
		MediaControlsModule,
		RouterModule.forChild([{ path: "", component: MediasListPage }])
	],
	exports: [],
	declarations: [MediasListPage]
})

export class MediasListPageModule {}
