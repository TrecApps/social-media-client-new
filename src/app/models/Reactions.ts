

export class ReactionPosting {

    reactType: string = "";
    makePrivate: boolean = false;
    brandId: string | undefined ;

}

export interface ContentReactionEntry {

    profileId: string;
    type: string;
    made: Date;

}

export interface ProfileReactionEntry {

    contentId: string;
    brandId: string;
    type: string;
    version: string;
    isPrivate: boolean;
    isStale: boolean;
    made: Date;

}