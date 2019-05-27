import { Dictionary } from "typescript-collections";
import { AppUtility } from "../components/app.utility";
import { Base as BaseModel } from "./base";
import { CounterInfo } from "./counters";

export class Media extends BaseModel {

	constructor() {
		super();
		delete this["Privileges"];
	}

	/** All instances */
	public static instances = new Dictionary<string, Media>();

	public static deserialize(json: any, media?: Media) {
		media = media || new Media();
		media.copy(json, data => {
			media.EndingTime = "-" === data.EndingTime ? undefined : new Date(data.EndingTime);
			media.Counters = new Dictionary<string, CounterInfo>();
			if (AppUtility.isArray(data.Counters, true)) {
				(data.Counters as Array<any>).forEach(o => media.Counters.setValue(o.Type, CounterInfo.deserialize(o)));
			}
			media.ansiTitle = AppUtility.toANSI(media.Title).toLowerCase();
		});
		return media;
	}

	static get(id: string) {
		return AppUtility.isNotEmpty(id) ? this.instances.getValue(id) : undefined;
	}

	public static update(data: any) {
		if (AppUtility.isObject(data, true)) {
			const media = data instanceof Media
				? data as Media
				: Media.deserialize(data, Media.instances.getValue(data.ID));
			Media.instances.setValue(media.ID, media);
		}
	}

	public static clone(data: any, status?: string) {
		return AppUtility.clone(data, ["MediaType", "Counters", "Images", "Thumbnails", "Attachments", "Created", "CreatedID", "LastModified", "LastModifiedID", "ansiTitle"], undefined, media => {
			media.Categories = AppUtility.toString(media.Categories, ",");
			if (AppUtility.isNotEmpty(status)) {
				media.Status = status;
			}
		});
	}

	ID = "";
	ParentID: string;
	OrderIndex: string;
	Status = "Draft";
	StartingTime = new Date();
	EndingTime: Date;
	LastUpdated = new Date();
	Categories = "";
	Title = "";
	Summary = "";
	Speakers = "";
	Tags = "";
	Details: string;
	MediaURI = "";
	MediaType = "Audio";
	Created = new Date();
	CreatedID = "";
	LastModified = new Date();
	LastModifiedID = "";
	Counters: Dictionary<string, CounterInfo> = undefined;
	Images = new Array<string>();
	Thumbnails = new Array<any>();
	Attachments = new Array<any>();

	ansiTitle = "";

	getLink(prefix: string, category?: Category) {
		category = category || Category.get(AppUtility.toArray(this.Categories)[0]);
		return category.getLink(prefix, "show") + "/" + AppUtility.toURI(this.ansiTitle);
	}

	getQueryParams(tabName?: string) {
		return AppUtility.toBase64Url({
			ID: this.ID,
			Tab: tabName
		});
	}
}

export class Category {

	/** All instances */
	public static instances = new Array<Category>();

	static deserialize(json: any, category?: Category) {
		category = category || new Category();
		category.name = json.name;
		if (AppUtility.isNotEmpty(json.aliasOf)) {
			category._aliasOf = Category.get(json.aliasOf);
		}
		else {
			category._icon = json.icon || "";
			category._image = json.image || "";
			category._path = AppUtility.toANSI(category.name, true);
			if (AppUtility.isObject(json.filterParams, true) && Object.keys(json.filterParams).length < 1) {
				category._filterParams = json.filterParams;
			}
		}
		return category;
	}

	static get(data: any) {
		let name = undefined as string;
		if (AppUtility.isArray(data, true)) {
			const element = (data as Array<{ [key: string]: any }>).find(e => e.Categories !== undefined);
			name = element !== undefined ? element.Categories.Contains as string : undefined;
		}
		else if (AppUtility.isNotEmpty(data)) {
			name = data as string;
		}
		return name !== undefined ? this.instances.find(category => category.name === name) : undefined;
	}

	static getFilterBy(category?: string, status: string = "Published", startingTime?: string, endingTime?: string, parentID?: string, query?: string) {
		const params = new Array<{ [key: string]: any }>();

		if (AppUtility.isNotEmpty(category)) {
			params.push({
				"Categories": {
					"Contains": category
				}
			});
		}

		if (AppUtility.isNotEmpty(status) && status !== "-") {
			params.push({
				"Status": {
					"Equals": status
				}
			});
		}

		if ("-" === startingTime) {
		}
		else {
			params.push({
				"StartingTime": {
					"GreaterOrEquals": AppUtility.isNotEmpty(startingTime) ? new Date(startingTime).toJSON() : "@nowHourQuater()"
				}
			});
		}

		if ("-" === endingTime) {
		}
		else {
			params.push({
				"Or": [
					{
						"EndingTime": {
							"Equals": "-"
						}
					},
					{
						"EndingTime": {
							"LessThan": AppUtility.isNotEmpty(endingTime) ? new Date(endingTime).toJSON().replace(/\-/g, "/").replace("T", " ").substr(0, 19) : "@nowHourQuater()"
						}
					}
				]
			});
		}

		params.push({
			"ParentID": AppUtility.isNotEmpty(parentID) ? { "Equals": parentID } : "IsNull"
		});

		return {
			"Query": query,
			"And": params
		} as { [key: string]: any };
	}

	private _aliasOf: Category;
	public name = "";

	private _icon = "";
	get icon(): string {
		return this._aliasOf !== undefined
			? this._aliasOf.icon
			: this._icon;
	}

	private _image = "";
	get image(): string {
		return this._aliasOf !== undefined
			? this._aliasOf.image
			: this._image;
	}

	private _path = "";
	get path(): string {
		return this._aliasOf !== undefined
			? this._aliasOf.path
			: this._path;
	}

	private _filterParams: { [key: string]: any };
	get filterParams(): { [key: string]: any } {
		return this._aliasOf !== undefined
			? this._aliasOf.filterParams
			: this._filterParams !== undefined
				? this._filterParams
				: Category.getFilterBy(this.name);
	}

	getLink(prefix: string, mode: string = "list") {
		return AppUtility.format("{{prefix}}/{{mode}}/" + this.path, { prefix: prefix, mode: mode });
	}

	getQueryParams(tabName?: string, title?: string) {
		return AppUtility.toBase64Url({
			Name: this._aliasOf !== undefined ? this._aliasOf.name : this.name,
			Tab: tabName,
			Title: title
		});
	}
}

export class Group {

	static deserialize(json: any, group?: Group) {
		group = group || new Group();
		AppUtility.copy(json, group, data => {
			group.categories = new Array<Category>();
			(data.categories as Array<any> || []).forEach(category => {
				if (AppUtility.isNotEmpty(category)) {
					const existed = Category.get(category);
					if (existed !== undefined) {
						group.categories.push(existed);
					}
				}
				else if (AppUtility.isObject(category, true)) {
					group.categories.push(Category.deserialize(category));
				}
			});
		});
		return group;
	}

	name = "";
	categories: Array<Category>;
}
