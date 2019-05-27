import { AppUtility } from "../components/app.utility";

/** Contact information */
export class ContactInfo {

	/*** Deserialize a contact information */
	public static deserialize(json: any, contactInfo?: ContactInfo) {
		contactInfo = contactInfo || new ContactInfo();
		AppUtility.copy(json, contactInfo);
		return contactInfo;
	}

	Name = "";
	Title = "";
	Phone = "";
	Email = "";
	Address = "";
	County = "";
	Province = "";
	Country = "";
	PostalCode = "";
	Notes = "";
	GPSLocation = "";
}
