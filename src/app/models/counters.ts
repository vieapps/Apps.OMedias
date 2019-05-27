import { AppUtility } from "../components/app.utility";

/** Based-Counter information */
export class CounterBase {

	constructor(type?: string, total?: number) {
		if (AppUtility.isNotEmpty(type) && total !== undefined) {
			this.Type = type;
			this.Total = total;
		}
	}

	/*** Deserialize a counter information */
	public static deserialize(json: any, counter?: CounterBase) {
		counter = counter || new CounterBase();
		AppUtility.copy(json, counter);
		return counter;
	}

	Type = "";
	Total = 0;
}

/** Counter information */
export class CounterInfo extends CounterBase {

	/*** Deserialize a counter information */
	public static deserialize(json: any, counter?: CounterInfo) {
		counter = counter || new CounterInfo();
		AppUtility.copy(json, counter);
		return counter;
	}

	LastUpdated = new Date();
	Month = 0;
	Week = 0;
}
