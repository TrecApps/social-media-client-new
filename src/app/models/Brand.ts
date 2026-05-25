export enum ResourceType {
    PUBLIC_FIGURE,
    ARTIST,
    MUSICIAN,
    ACTOR,
    POLITICIAN,
    MEDIA_OUTLET,
    STUDIO,
    SHOW,
    REGION,
    INSTITUTION,
    SCHOOL,
    COLLEGE,
    ORGANIZATION,
    CONCEPT,
    LITERATURE,
    BOOK,
    FILM,
    TAXONOMY,
    ART,
    BRAND,
    DRAWING,
    PAINTING,
    SCULPTURE,
    SONG,
    SPECIES,
    ANIMAL,
    PLANT,
    FOOD,
    CONTINENT,
    COUNTRY,
    BIOME,
    DEVICE,
    MACHINE,
    LANGUAGE,
    RESTAURANT,
    GAME,
    BOARD_GAME,
    SPORT,
    CARD_GAME,
    VIDEO_GAME,
    APP
}


export interface ObjectMap {
    [key: string]: string;
}

export interface BrandInfo
{ 
    id: string;
    resourceTypePrimary: ResourceType;
    resourceTypeSecondary: ResourceType | undefined;
    resourceTypeTertiary: ResourceType | undefined;
    name: string;
    defaultLanguage: string;
    brandId: string | undefined;
}

export interface Brand{
        id: string;

    /**
     * Names the Brand is known as
     */
    names: string[];

    /**
     * The Type of Brand (institution, public figure, etc.)
     */
    resourceTypes: ResourceType[];

    /**
     * The language the original article was written in
     */
    defaultLanguage: string;

    /**
     * Verification status (can it be used?)
     */
    reviewStage: string;
    /**
     * Link to a verified Brand Account
     */
    brandId: string | undefined;
}

export interface BrandSearchResult{
    brand: Brand;
    image: string | undefined;
}

export interface BrandContent{
        /**
     * The article-style content about a given brand - in markdown format
     */
    content: string;
    /**
     * The Main image to present (as base64)
     */
    imageData: string | undefined;
    /**
     * Profile Description
     */
    imageDescription: string | undefined;
    /**
     * Metadata to put in a table
     */
    metadata: ObjectMap;
}

export interface BrandComplete{
    brand: Brand;
    content: BrandContent;
}


