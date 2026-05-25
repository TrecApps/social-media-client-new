export interface RObjectMap {
    [key: string]: number;
}

export class ReactionStats {
    reactions: RObjectMap;
    yourReaction: string | undefined;
    id: number | undefined;

    constructor(reactions: RObjectMap, yourReaction: string | undefined, id: number | undefined){
        this.reactions = reactions;
        this.yourReaction = yourReaction;
        this.id = id;
    }
}

export interface ResponseObj{
    status: number;
    message: string;
    id?: string;
    reactions: RObjectMap | undefined;
    reactStats: ReactionStats | undefined;
}