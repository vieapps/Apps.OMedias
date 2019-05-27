import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { RouterModule } from "@angular/router";
import { IonicModule } from "@ionic/angular";
import { AppFormsModule } from "../../../components/forms.module";
import { MediasUpdatePage } from "./update.page";

@NgModule({
	imports: [
		CommonModule,
		IonicModule,
		AppFormsModule,
		RouterModule.forChild([{ path: "", component: MediasUpdatePage }])
	],
	exports: [],
	declarations: [MediasUpdatePage]
})

export class MediasUpdatePageModule {}
