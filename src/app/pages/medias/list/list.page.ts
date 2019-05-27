import { Subscription } from "rxjs";
import { List } from "linqts";
import { Component, OnInit, OnDestroy, AfterViewInit, ViewChild, NgZone } from "@angular/core";
import { registerLocaleData } from "@angular/common";
import { IonSearchbar, IonInfiniteScroll } from "@ionic/angular";
import { AppEvents } from "../../../components/app.events";
import { AppCrypto } from "../../../components/app.crypto";
import { AppUtility } from "../../../components/app.utility";
import { TrackingUtility } from "../../../components/app.utility.trackings";
import { PlatformUtility } from "../../../components/app.utility.platform";
import { AppPagination, AppDataPagination, AppDataRequest } from "../../../components/app.pagination";
import { ConfigurationService } from "../../../services/configuration.service";
import { AuthenticationService } from "../../../services/authentication.service";
import { MediasService } from "../../../services/medias.service";
import { Media, Category } from "../../../models/media";
import { MediaHomeScreenControl } from "../controls/home";

@Component({
	selector: "page-medias-list",
	templateUrl: "./list.page.html",
	styleUrls: ["./list.page.scss"]
})

export class MediasListPage implements OnInit, OnDestroy, AfterViewInit {

	constructor (
		public zone: NgZone,
		public configSvc: ConfigurationService,
		public authSvc: AuthenticationService,
		public mediasSvc: MediasService
	) {
		this.configSvc.locales.forEach(locale => registerLocaleData(this.configSvc.getLocaleData(locale)));
	}

	requestParams: { [key: string]: any };
	tab = MediaHomeScreenControl.tabName;
	title = "Broadcasted";
	medias: Array<Media>;
	categories: Array<Category>;
	category: Category;
	searching = false;
	filtering = false;
	pageNumber = 0;
	pagination: AppDataPagination;
	request: AppDataRequest;
	filterBy = {
		Query: undefined as string,
		And: new Array<{ [key: string]: any }>()
	};

	subscription: Subscription;
	@ViewChild(IonSearchbar) searchCtrl: IonSearchbar;
	@ViewChild(IonInfiniteScroll) scrollCtrl: IonInfiniteScroll;

	ngOnInit() {
		this.requestParams = this.configSvc.requestParams;
		this.tab = this.requestParams.Tab || MediaHomeScreenControl.tabName;
		this.category = Category.get(this.requestParams.Name);
		this.searching = this.configSvc.currentUrl === MediaHomeScreenControl.urlPrefix + "/search";
		this.prepareTitleAsync();
		this.filterBy.And.push(this.authSvc.isServiceModerator(this.mediasSvc.name)
			? Category.getFilterBy(this.category !== undefined ? this.category.name : "", "-", "-", "-")
			: this.category !== undefined ? this.category.filterParams : Category.getFilterBy()
		);

		if (this.searching) {
			this.medias = [];
		}
		else if (this.category !== undefined) {
			this.pagination = AppPagination.get({
				FilterBy: this.filterBy,
				SortBy: this.sortBy
			}, this.mediasSvc.name) || AppPagination.getDefault();
			this.pagination.PageNumber = this.pageNumber;
			this.searchAsync();
		}
		else {
			this.medias = undefined;
			this.categories = this.mediasSvc.lists;
			if (this.categories === undefined || this.categories.length < 1) {
				this.categories = this.mediasSvc.categories;
			}
			AppEvents.on(this.mediasSvc.name, info => {
				if ("ListsUpdated" === info.args.Type) {
					this.categories = this.mediasSvc.lists;
					if (this.categories === undefined || this.categories.length < 1) {
						this.categories = this.mediasSvc.categories;
					}
				}
			}, "ListsUpdatedEventHandlerOfMediaListPage");
		}
	}

	ngAfterViewInit() {
		this.zone.run(async () => {
			this.searchCtrl.placeholder = await this.configSvc.getResourceAsync("omedias.list.searchbar." + (this.searching ? "search" : "filter"));
			if (this.searching) {
				PlatformUtility.focus(this.searchCtrl);
			}
		});
	}

	ngOnDestroy() {
		if (this.subscription !== undefined) {
			this.subscription.unsubscribe();
		}
		if (this.categories !== undefined) {
			AppEvents.off("ListsUpdated", "ListsUpdatedEventHandlerOfMediaListPage");
		}
	}

	get locale() {
		return this.configSvc.locale;
	}

	get totalRecords() {
		return AppPagination.computeTotal(this.pageNumber, this.pagination);
	}

	get sortBy() {
		return {
			StartingTime: "Descending",
			LastUpdated: "Descending"
		} as { [key: string]: any };
	}

	get defaultHref() {
		return MediaHomeScreenControl.urlPrefix + "/list";
	}

	get canBack() {
		return this.searching || this.category !== undefined;
	}

	get canSearch() {
		return !this.searching && this.configSvc.currentUrl.startsWith(MediaHomeScreenControl.urlPrefix);
	}

	get canCreate() {
		return this.authSvc.isServiceModerator(this.mediasSvc.name) && this.canSearch;
	}

	createAsync() {
		const url = MediaHomeScreenControl.urlPrefix + "/update/" + AppCrypto.md5(Math.random() + "")
			+ "?x-request=" + AppUtility.toBase64Url({ Category: this.category !== undefined ? this.category.name : undefined });
		return this.configSvc.navigateForwardAsync(url);
	}

	openSearch() {
		this.configSvc.navigateForwardAsync(MediaHomeScreenControl.urlPrefix + "/search");
	}

	async prepareTitleAsync() {
		if (this.searching) {
			this.configSvc.appTitle = this.title = await this.configSvc.getResourceAsync("omedias.title.search");
		}
		else {
			this.configSvc.appTitle = this.title = this.requestParams.Title;
			if (this.title === undefined) {
				this.configSvc.appTitle = this.title = this.category !== undefined
					? this.category.name
					: await this.configSvc.getResourceAsync("omedias.tabs.medias.title");
			}
		}
	}

	trackCategory(index: number, category: Category) {
		return `${category.name}@${index}`;
	}

	openCategory(category: Category) {
		this.configSvc.navigateForwardAsync(MediaHomeScreenControl.getCategoryUrl(category));
	}

	trackMedia(index: number, media: Media) {
		return `${media.ID}@${index}`;
	}

	openMedia(media: Media) {
		this.configSvc.navigateForwardAsync(MediaHomeScreenControl.getMediaUrl(media));
	}

	onStartSearch($event: any) {
		this.cancel();
		if (AppUtility.isNotEmpty($event.detail.value)) {
			this.filterBy.Query = $event.detail.value;
			if (this.searching) {
				this.medias = [];
				this.pageNumber = 0;
				this.pagination = AppPagination.getDefault();
				this.searchAsync(() => this.scrollCtrl.disabled = false);
			}
			else {
				this.prepareResults();
			}
		}
	}

	onCancelSearch() {
		this.cancel();
		this.filterBy.Query = undefined;
		if (this.searching) {
			this.medias = [];
		}
		else {
			this.prepareResults();
		}
	}

	onScroll() {
		if (this.pagination.PageNumber < this.pagination.TotalPages) {
			this.searchAsync(() => {
				if (this.scrollCtrl !== undefined) {
					this.scrollCtrl.complete();
				}
			});
		}
		else if (this.scrollCtrl !== undefined) {
			this.scrollCtrl.complete();
			this.scrollCtrl.disabled = true;
		}
	}

	async searchAsync(onNext?: () => void) {
		this.categories = undefined;
		this.request = AppPagination.buildRequest(this.filterBy, this.searching ? undefined : this.sortBy, this.pagination);
		if (this.searching) {
			this.subscription = this.mediasSvc.search(this.request, data => this.searchOnNext(data, onNext));
		}
		else {
			await this.mediasSvc.searchAsync(this.request, data => this.searchOnNext(data, onNext));
		}
	}

	searchOnNext(data: any, onNext?: () => void) {
		this.pageNumber++;
		this.pagination = data !== undefined ? AppPagination.getDefault(data) : AppPagination.get(this.request, this.mediasSvc.name);
		this.pagination.PageNumber = this.pageNumber;
		this.prepareResults(onNext, data !== undefined ? data.Objects : undefined);
		TrackingUtility.trackAsync(this.title + ` [${this.pageNumber}]`, this.configSvc.currentUrl);
	}

	cancel(dontDisableInfiniteScroll?: boolean) {
		if (this.subscription !== undefined) {
			this.subscription.unsubscribe();
			this.subscription = undefined;
		}
		if (AppUtility.isFalse(dontDisableInfiniteScroll)) {
			this.scrollCtrl.disabled = true;
		}
	}

	prepareResults(onNext?: () => void, results?: Array<any>) {
		if (this.searching) {
			(results || []).forEach(o => {
				const media = Media.instances.getValue(o.ID);
				this.medias.push(media);
			});
		}
		else {
			// initialize the LINQ list
			let objects = new List(results === undefined ? Media.instances.values() as Array<Media> : results.map(o => Media.instances.getValue(o.ID)));

			// filter
			if (this.filtering && AppUtility.isNotEmpty(this.filterBy.Query)) {
				const query = AppUtility.toANSI(this.filterBy.Query).trim().toLowerCase();
				objects = objects.Where(o => o.ansiTitle.indexOf(query) > -1);
			}

			// sort
			objects = objects.OrderBy(o => o.StartingTime).ThenByDescending(o => o.LastUpdated);

			// get array of profiles
			if (results === undefined) {
				if (this.filtering) {
					this.medias = objects.ToArray();
				}
				else {
					this.medias = objects.Take(this.pageNumber * this.pagination.PageSize).ToArray();
				}
			}
			else {
				this.medias = (this.medias || new Array<Media>()).concat(objects.ToArray());
			}
		}

		// done
		if (onNext !== undefined) {
			onNext();
		}
	}

}
