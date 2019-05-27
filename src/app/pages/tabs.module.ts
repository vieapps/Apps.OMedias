import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { RouterModule, Routes } from "@angular/router";
import { IonicModule } from "@ionic/angular";
import { AppReadyGuardService } from "../services/base.service";
import { TabsPage } from "./tabs.page";

export const routes: Routes = [
	{
		path: "",
		component: TabsPage,
		children: [
			{
				path: "all",
				canActivate: [AppReadyGuardService],
				children: [
					{
						path: "",
						loadChildren: "./home.module#HomePageModule"
					}
				]
			},
			{
				path: "channels",
				children: [
					{
						path: "",
						data: { preload: true },
						loadChildren: "./home.module#HomePageModule"
					},
					{
						path: "list/:id",
						canActivate: [AppReadyGuardService],
						loadChildren: "./medias/list/list.module#MediasListPageModule"
					}
				]
			},
			{
				path: "medias",
				canActivate: [AppReadyGuardService],
				loadChildren: "./medias/medias.module#MediasModule"
			},
			{
				path: "**",
				redirectTo: "channels",
				pathMatch: "full"
			}
		]
	}
];

@NgModule({
	imports: [
		CommonModule,
		IonicModule,
		RouterModule.forChild(routes)
	],
	exports: [RouterModule],
	declarations: [TabsPage]
})

export class TabsPageModule {}
