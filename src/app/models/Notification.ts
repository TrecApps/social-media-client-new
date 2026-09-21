import { NotificationService } from "../services/notification-service";


export type NotificationStatus = "UNSEEN" | "UNREAD" | "READ";
export type ImageEndpointType = "REGULAR" | "USER_PROFILE" | "BRAND_PROFILE";

export interface NotifyPost {
    type: ImageEndpointType;
    imageId: string | undefined;
    message: string;
    time: Date;
    category: string;
    relevantId: string;
    appSpecific: boolean;
}

export interface Notification {
    status: NotificationStatus;
    notificationId: string;
    app: string | undefined;
    post: NotifyPost;
}

export interface NotificationMarkPost {
    notifications: string[];
    status: NotificationStatus;
}