

export interface MediaEventId {
    profile: string;
    randomId: string;
    category: string;
    added: Date;
}


export interface SocialMediaEvent {
    id: MediaEventId;
    contentId: string;
    parentContentId: string | undefined;
    type: string;
    otherProfile: string | undefined;
}

export type SocialMediaEventType = "POST" | "COMMENT" | "POST_REACTION" | "COMMENT_REACTION" | "CONTENT_EDIT";

export class PostFilterRequest {
    type:SocialMediaEventType;
    from: string;

    decrease: boolean;

    constructor(type: SocialMediaEventType, from: string, decrease: boolean = true){
        this.decrease = decrease;
        this.from = from;
        this.type = type;
    }
}

export interface ProfileFilter {
    from: string;
    type: SocialMediaEventType;
    probability: number;
}

export interface ProfileFilterList {
    id: string;
    filterList: ProfileFilter[];
}