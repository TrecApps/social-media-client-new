import { BasicProfile } from "./Profile";

export class ContentPost {

    content: string = "";
    moduleId: string | undefined;
    parentId: string | undefined;
    profileId: string = "";

}

export interface ContentPut {

    content: string;
    contentId: string;

}

export interface PostingContent {

    content: string;
    made: Date;
    version: string;

}

export interface Posting {


    id: string;          // ID of the posting

    parents: string[]; // Parents (Posting is a comment if non-empty)
    parent: string | undefined;

    posterId: string;          // Account ID of the poster
    userAccountId: string;   // User Account that posted it

    ownerId: string | undefined;       // Populated only if poster directs it to another profile

    moduleId: string | undefined;        // If part of a group, which group this belongs to

    made: Date;

    deleteSet: Date | undefined;

    contents: PostingContent[];

}

export interface FullPosting {
    posting: Posting;               // There must be a posting
    posterDetails: BasicProfile;             // There must be a poster name
    moduleName: string | undefined; // There may or mey not be a module attached to the post
    ownerName: BasicProfile | undefined;  // There may or may not be an onwer seperate from the poster

    replies: FullPosting[];
}


export type BasicProfileFunction = (val: BasicProfile) => void;

export type PostingFunction = (val: Posting) => void;