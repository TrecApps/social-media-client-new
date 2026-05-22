export type ImageState =
  "UPLOADED" | // Just uploaded, unsure what the status is, do nothing once analysis is performed
  "ERROR" | // Error in processing the image
  "ADULT" | // Image is considered adult material, DO NOT make public
  "NON_ADULT" | // Image is not adult, but not public either
  "PRE_PUBLIC" | // similar to UPLOADED, but make public once analysis is done (if not adult)
  "PRE_PROFILE" | // siilar to PRE_PUBLIC, but make the image the profile of the uploader
  "PUBLIC" | // Image is in the public repository, no access restrictions are in place
  "NEW" ;    // Just selected, not saved to TrecApps yet


export interface ImageRecord {
  id: string | undefined;
  creator: string;
  album: string[]; // the Albums the image belongs to
  name: string; // Name of the image
  app: string; // the app that uploaded this image
  type: string; // the type of image
  subType: string;
  state: ImageState; // The state of the image entry
  createdAt: Date | undefined; // when was the image uploaded
  defaultCrop: string | undefined;     // the type of cropping that should be applied
  width: number;
  height: number;
  allowPublic: boolean;

  deleteOn: Date | undefined;
} 

export interface ImageEntry {
  record: ImageRecord;
  src: string;
}

export enum ImageUploadMode {
  uploaded,
  prePublic,
  preProfile
}

export enum ImageVisibility {
  PUBLIC,         // Accessible without Restriction
  PUBLIC_AUTH,    // Accessible to all authenticated users (restrictions for adult images still apply)
  PROTECTED       // Accessible to the owner and authorized readers
}

export interface ImageVisibilityOption {
  option: ImageVisibility;
  optionName: string;
  optionExplaination: string;
  available: (ir: ImageRecord) => boolean
}