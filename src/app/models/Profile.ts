import { Education } from "./Education";
import { FeatureShow } from "./Model";
import { WorkExpHolder } from "./WorkExperience";


export interface ProfileLink {
    title: string;
    link: string;
    showLink: FeatureShow;
}

export type PronounVisibility = "SHOW_ALL" | "SHOW_ON_PAGE" | "SHOW_ON_POSTS" | "DO_NOT_SHOW";

export interface Favorite {

    brandId: string;
    brandName: string;
    type: string;

    show: FeatureShow;
}

export interface Skill {
    name: string;
    details: string;
    level: number;
}

export class Profile {
    
    id: string = "";  // Prefix should be "User-" or "Brand-" and the UUID of the user/brand

    profileType: "USER" | "BRAND" = "USER";
    
    title: string = "";

    aboutMe: string = "";
    aboutMeShort: string = "";

    links: ProfileLink[] = [];

    pronouns: string = "";
    pronounVisibility: PronounVisibility = "DO_NOT_SHOW";

    // For Coffeeshop
    favorites: Favorite[] = [];

    education: Education[] = []; // and Water Cooler

    //Set<String> brandLikes;

    // brandDislikes: BrandDislike[] = [];

    // Water Cooler

    workExperiences: WorkExpHolder[] = [];

    skills: Skill[] = [];
}

export class PostProfile {

    aboutMe: string = "";
    aboutMeShort: string = "";
    pronouns: string = "";
    pronounVisibility: PronounVisibility = "DO_NOT_SHOW";

}

export interface ProfileSearchResult {

    id: string;
    displayName: string;
    shortAboutMe: string;

}

export interface BasicProfile {
    id: string;
    displayName: string;
    shortAboutMe: string | undefined;
    pronouns: string | undefined;
}