import { FeatureShow } from "./Model";


export type WorkType = 
    "FULL_TIME" |
    "PART_TIME" |
    "CONTRACT" |
    "FREELANCE" |
    "INDEPENDENT"
;



export class WorkExp {

    type: WorkType = "FULL_TIME";

    employerId: string = "";
    employerName: string = "";

    startDate: Date = new Date();

    endDate: Date | undefined;

    title: string = "";

    description: string = "";

    subExperience: WorkExp[] = [];

    shortSubExperience: string = "";

}


export class WorkExpHolder {
    
    perspective: string[] = [];        // Perspectives of a set of work experiences
    showExperiences: FeatureShow = "PUBLIC"; // Whether to show based off of who is looking
    allowAnalytics: boolean = true;

    workExperience: WorkExp[] = [];         // Set of Work experiences
}
