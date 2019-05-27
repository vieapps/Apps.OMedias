import { List } from "linqts";
import { Injectable } from "@angular/core";
import { AppStorage } from "../components/app.storage";
import { AppRTU, AppMessage } from "../components/app.apis";
import { AppEvents } from "../components/app.events";
import { AppCustomCompleter } from "../components/app.completer";
import { AppPagination } from "../components/app.pagination";
import { AppUtility } from "../components/app.utility";
import { PlatformUtility } from "../components/app.utility.platform";
import { CounterInfo } from "../models/counters";
import { Media, Category, Group } from "../models/media";
import { Base as BaseService } from "./base.service";
import { ConfigurationService } from "./configuration.service";

@Injectable()
export class MediasService extends BaseService {

	constructor(public configSvc: ConfigurationService) {
		super("Omedias");
		this.initialize();
	}

	private initialize() {
		AppEvents.on("App", info => {
			if ("Initialized" === info.args.Type) {
				this.initializeAsync(() => console.log(`[${this.name}]: The service is initialized`));
			}
		});
		this.registerEventHandlers();
	}

	public initializeAsync(onNext?: () => void) {
		if ("initialized" === this.configSvc.appConfig.extras["Medias-State"]) {
			console.log(`[${this.name}]: The service is initialized`);
			return new Promise<void>(onNext !== undefined ? () => onNext() : () => {});
		}

		return this.loadCategoriesAsync(() => {
			this.getCategories();
			PlatformUtility.invoke(async () => await Promise.all([
				this.loadGroupsAsync(() => this.getGroups()),
				this.loadListsAsync(() => this.getLists())
			]), this.categories.length > 0 ? 456 : 789);

			this.configSvc.appConfig.extras["Medias-State"] = "initialized";
			if (onNext !== undefined) {
				onNext();
			}
		});
	}

	public registerEventHandlers() {
		AppRTU.registerAsObjectScopeProcessor(this.name, "Content", message => this.processUpdateMessage(message));
		AppRTU.registerAsObjectScopeProcessor(this.name, "Definitions", async message => {
			switch (message.Type.Event) {
				case "Categories":
					await this.storeCategoriesAsync(message.Data as Array<any>);
					break;
				case "Groups":
					await this.storeGroupsAsync(message.Data as Array<any>);
					break;
				case "Lists":
					await this.storeListsAsync(message.Data as Array<any>);
					break;
				case "Content":
				case "Content#Forms":
					this.configSvc.setDefinition(message.Data, this.name, "definitions", "content", "forms");
					break;
				default:
					if (this.configSvc.isDebug) {
						console.warn(`[${this.name}]: Got an update of definitions`, message);
					}
					break;
			}
		});
		AppRTU.registerAsServiceScopeProcessor("Scheduler", () => {
			this.getCategories();
			PlatformUtility.invoke(() => {
				this.getGroups();
				this.getLists();
			}, 789);
		});
		if (this.configSvc.isDebug) {
			AppRTU.registerAsServiceScopeProcessor(this.name, () => {});
		}
	}

	public get completerDataSource() {
		return new AppCustomCompleter(
			term => AppUtility.format(super.getSearchURI("content", this.configSvc.relatedQuery), { request: AppUtility.toBase64Url(AppPagination.buildRequest({ Query: term })) }),
			data => (data.Objects as Array<any> || []).map(o => {
				const media = Media.deserialize(o);
				return {
					title: media.Title,
					description: media.Summary,
					image: media.Images.length > 0 ? media.Images[0] : "",
					originalObject: media
				};
			})
		);
	}

	public search(request: any, onNext?: (data?: any) => void, onError?: (error?: any) => void) {
		return super.search(
			super.getSearchURI("content", this.configSvc.relatedQuery),
			request,
			data => {
				if (data !== undefined && AppUtility.isArray(data.Objects, true)) {
					(data.Objects as Array<any>).forEach(o => Media.update(o));
				}
				if (onNext !== undefined) {
					onNext(data);
				}
			},
			error => {
				console.error(super.getErrorMessage("Error occurred while searching", error));
				if (onError !== undefined) {
					onError(error);
				}
			}
		);
	}

	public searchAsync(request: any, onNext?: (data?: any) => void, onError?: (error?: any) => void) {
		return super.searchAsync(
			super.getSearchURI("content", this.configSvc.relatedQuery),
			request,
			data => {
				if (data !== undefined && AppUtility.isArray(data.Objects, true)) {
					(data.Objects as Array<any>).forEach(o => Media.update(o));
				}
				if (onNext !== undefined) {
					onNext(data);
				}
			},
			error => {
				console.error(super.getErrorMessage("Error occurred while searching", error));
				if (onError !== undefined) {
					onError(error);
				}
			}
		);
	}

	public getAsync(id: string, onNext?: (data?: any) => void, onError?: (error?: any) => void, dontUpdateCounter?: boolean) {
		return Media.instances.containsKey(id)
			? new Promise<void>(onNext !== undefined ? () => onNext() : () => {})
			: super.readAsync(
					super.getURI("content", id),
					data => {
						Media.update(data);
						if (AppUtility.isFalse(dontUpdateCounter)) {
							this.increaseCounters(id);
						}
						if (onNext !== undefined) {
							onNext(data);
						}
					},
					error => {
						console.error(super.getErrorMessage("Error occurred while reading", error));
						if (onError !== undefined) {
							onError(error);
						}
					}
				);
	}

	public increaseCounters(id: string, action?: string, onNext?: () => void) {
		if (Media.instances.containsKey(id)) {
			super.send({
				ServiceName: this.name,
				ObjectName: "content",
				Query: {
					"object-identity": "counters",
					"id": id,
					"action": action || "view"
				}
			}, data => this.updateCounters(data));
		}
		if (onNext !== undefined) {
			onNext();
		}
	}

	private updateCounters(data: any, onNext?: () => void) {
		const media = AppUtility.isObject(data, true)
			? Media.instances.getValue(data.ID)
			: undefined;
		if (media !== undefined && AppUtility.isArray(data.Counters, true)) {
			(data.Counters as Array<any>).forEach(c => media.Counters.setValue(c.Type, CounterInfo.deserialize(c)));
			AppEvents.broadcast(this.name, { Type: "StatisticsUpdated", ID: media.ID });
		}
		if (onNext !== undefined) {
			onNext();
		}
	}

	public createAsync(body: any, onNext?: (data?: any) => void, onError?: (error?: any) => void) {
		return super.createAsync(
			super.getURI("content"),
			body,
			data => {
				Media.update(data);
				if (onNext !== undefined) {
					onNext(data);
				}
			},
			error => {
				console.error(super.getErrorMessage("Error occurred while creating", error));
				if (onError !== undefined) {
					onError(error);
				}
			}
		);
	}

	public updateAsync(body: any, onNext?: (data?: any) => void, onError?: (error?: any) => void) {
		return super.updateAsync(
			super.getURI("content", body.ID),
			body,
			data => {
				Media.update(data);
				if (onNext !== undefined) {
					onNext(data);
				}
			},
			error => {
				console.error(super.getErrorMessage("Error occurred while updating", error));
				if (onError !== undefined) {
					onError(error);
				}
			}
	);
	}

	public deleteAsync(id: string, onNext?: (data?: any) => void, onError?: (error?: any) => void) {
		return super.deleteAsync(
			super.getURI("content", id),
			data => {
				Media.instances.remove(id);
				if (onNext !== undefined) {
					onNext(data);
				}
			},
			error => {
				console.error(super.getErrorMessage("Error occurred while deleting", error));
				if (onError !== undefined) {
					onError(error);
				}
			}
		);
	}

	private processUpdateMessage(message: AppMessage) {
		switch (message.Type.Event) {
			case "Counters":
				this.updateCounters(message.Data);
				break;
			case "Delete":
				Media.instances.remove(message.Data.ID);
				AppEvents.broadcast(this.name, { Type: "Deleted", ID: message.Data.ID, Categories: message.Data.Categories });
				break;
			default:
				if (AppUtility.isNotEmpty(message.Data.ID)) {
					Media.update(message.Data);
					AppEvents.broadcast(this.name, { Type: "Updated", ID: message.Data.ID });
				}
				else if (this.configSvc.isDebug) {
					console.warn(super.getLogMessage("Got an update"), message);
				}
				break;
		}
	}

	private async loadCategoriesAsync(onNext?: (categories?: Array<Category>) => void) {
		const categories = await AppStorage.getAsync("Medias-Categories");
		if (AppUtility.isArray(categories, true)) {
			this.configSvc.appConfig.extras["Medias-Categories"] = new List<any>(categories).Select(category => Category.deserialize(category)).ToArray();
			AppEvents.broadcast(this.name, { Type: "CategoriesUpdated" });
			if (onNext !== undefined) {
				onNext(this.categories);
			}
		}
		else if (onNext !== undefined) {
			onNext(new Array<Category>());
		}
	}

	private async storeCategoriesAsync(categories: Array<any>, onNext?: (categories?: Array<Category>) => void) {
		if (categories !== undefined && categories.length > 0) {
			this.configSvc.appConfig.extras["Medias-Categories"] = Category.instances = new List(categories).Select(category => Category.deserialize(category)).ToArray();
			await AppStorage.setAsync("Medias-Categories", this.categories);
			this.configSvc.setDefinition(this.categories, this.name, "definitions", "categories");
			AppEvents.broadcast(this.name, { Type: "CategoriesUpdated" });
			if (onNext !== undefined) {
				onNext(this.categories);
			}
		}
		else if (onNext !== undefined) {
			onNext(new Array<Category>());
		}
	}

	private getCategories() {
		super.send({
			ServiceName: this.name,
			ObjectName: "definitions",
			Query: {
				"object-identity": "categories"
			}
		}, async data => await this.storeCategoriesAsync(data as Array<any>));
	}

	public get categories() {
		const objects = this.configSvc.appConfig.extras["Medias-Categories"] as Array<Category>;
		return AppUtility.isArray(objects, true) && objects.length > 0
			? objects
			: new Array<Category>();
	}

	private async loadGroupsAsync(onNext?: (groups?: Array<Group>) => void) {
		const groups = await AppStorage.getAsync("Medias-Groups");
		if (AppUtility.isArray(groups, true)) {
			this.configSvc.appConfig.extras["Medias-Groups"] = new List<any>(groups).Select(group => Group.deserialize(group)).ToArray();
			AppEvents.broadcast(this.name, { Type: "GroupsUpdated" });
			if (onNext !== undefined) {
				onNext(this.groups);
			}
		}
		else if (onNext !== undefined) {
			onNext(new Array<Group>());
		}
	}

	private async storeGroupsAsync(groups: Array<any>, onNext?: (groups?: Array<Group>) => void) {
		if (groups !== undefined && groups.length > 0) {
			this.configSvc.appConfig.extras["Medias-Groups"] = new List(groups).Select(group => Group.deserialize(group)).ToArray();
			await AppStorage.setAsync("Medias-Groups", this.groups);
			AppEvents.broadcast(this.name, { Type: "GroupsUpdated" });
			if (onNext !== undefined) {
				onNext(this.groups);
			}
		}
		else if (onNext !== undefined) {
			onNext(new Array<Group>());
		}
	}

	private getGroups() {
		super.send({
			ServiceName: this.name,
			ObjectName: "definitions",
			Query: {
				"object-identity": "groups"
			}
		}, async data => await this.storeGroupsAsync(data as Array<any>));
	}

	public get groups() {
		const objects = this.configSvc.appConfig.extras["Medias-Groups"] as Array<Group>;
		return AppUtility.isArray(objects, true) && objects.length > 0
			? objects
			: new Array<Group>();
	}

	private async loadListsAsync(onNext?: (lists?: Array<Category>) => void) {
		const lists = await AppStorage.getAsync("Medias-Lists");
		if (AppUtility.isArray(lists, true)) {
			this.configSvc.appConfig.extras["Medias-Lists"] = new List<any>(lists).Select(category => Category.deserialize(category)).ToArray();
			AppEvents.broadcast(this.name, { Type: "ListsUpdated" });
			if (onNext !== undefined) {
				onNext(this.lists);
			}
		}
		else if (onNext !== undefined) {
			onNext(new Array<Category>());
		}
	}

	private async storeListsAsync(lists: Array<any>, onNext?: (lists?: Array<Category>) => void) {
		if (lists !== undefined && lists.length > 0) {
			this.configSvc.appConfig.extras["Medias-Lists"] = new List(lists).Select(category => Category.deserialize(category)).ToArray();
			await AppStorage.setAsync("Medias-Lists", this.lists);
			AppEvents.broadcast(this.name, { Type: "ListsUpdated" });
			if (onNext !== undefined) {
				onNext(this.lists);
			}
		}
		else if (onNext !== undefined) {
			onNext(new Array<Category>());
		}
	}

	private getLists() {
		super.send({
			ServiceName: this.name,
			ObjectName: "definitions",
			Query: {
				"object-identity": "lists"
			}
		}, async data => await this.storeListsAsync(data as Array<any>));
	}

	public get lists() {
		const objects = this.configSvc.appConfig.extras["Medias-Lists"] as Array<Category>;
		return AppUtility.isArray(objects, true) && objects.length > 0
			? objects
			: new Array<Category>();
	}

}
