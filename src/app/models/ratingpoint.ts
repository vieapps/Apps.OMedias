import { AppUtility } from "../components/app.utility";

/** Rating information */
export class RatingPoint {

	public static deserialize(json: any, ratingPoint?: RatingPoint) {
		ratingPoint = ratingPoint || new RatingPoint();
		AppUtility.copy(json, ratingPoint);
		return ratingPoint;
	}

	Type = "";
	Total = 0;
	Points = 0.0;
	Average = 0.0;
}
