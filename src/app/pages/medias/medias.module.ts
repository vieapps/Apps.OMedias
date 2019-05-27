import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { RouterModule, Routes } from "@angular/router";
import { IonicModule } from "@ionic/angular";
import { AuthenticatedGuardService } from "../../services/base.service";

import { MediaControlsModule } from "./controls.module";
import { MediasListPageModule } from "./list/list.module";
import { MediasUpdatePageModule } from "./update/update.module";

export const routes: Routes = [
	{
		path: "",
		loadChildren: "../medias/list/list.module#MediasListPageModule"
	},
	{
		path: "search",
		loadChildren: "../medias/list/list.module#MediasListPageModule"
	},
	{
		path: "list/:data",
		loadChildren: "../medias/list/list.module#MediasListPageModule"
	},
	{
		path: "show/:data",
		loadChildren: "../medias/list/list.module#MediasListPageModule"
	},
	{
		path: "update/:data",
		canActivate: [AuthenticatedGuardService],
		loadChildren: "../medias/update/update.module#MediasUpdatePageModule"
	},
	{
		path: "**",
		redirectTo: "",
		pathMatch: "full"
	}
];

@NgModule({
	imports: [
		CommonModule,
		IonicModule,
		MediaControlsModule,
		MediasListPageModule,
		MediasUpdatePageModule,
		RouterModule.forChild(routes)
	],
	exports: [RouterModule],
	declarations: []
})

export class MediasModule {}
