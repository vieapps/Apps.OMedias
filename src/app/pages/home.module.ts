import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { RouterModule } from "@angular/router";
import { IonicModule } from "@ionic/angular";
import { BookControlsModule } from "./books/controls.module";
import { MediaControlsModule } from "./medias/controls.module";
import { HomePage } from "./home.page";

@NgModule({
	imports: [
		CommonModule,
		IonicModule,
		BookControlsModule,
		MediaControlsModule,
		RouterModule.forChild([{ path: "", component: HomePage }])
	],
	exports: [],
	declarations: [HomePage]
})

export class HomePageModule {}
