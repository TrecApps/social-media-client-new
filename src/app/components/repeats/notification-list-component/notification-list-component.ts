import { Component, Input } from '@angular/core';
import { Notification } from '../../../models/Notification';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ElementContainerDirective } from '../../../directives/element-container-directive';
import { ElementItemDirective } from '../../../directives/element-item-directive';
import { environment } from '../../../environment/environment';
import { ResponseObj } from '../../../models/ResponseObj';
import { NotificationService } from '../../../services/notification-service';
import { MessagingService } from '../../../services/messaging-service';
import { NotifyPipe } from '../../../pipes/notify-pipe';
import { PanelManagerService } from '../../../services/panel-manager-service';

@Component({
  selector: 'app-notification-list-component',
  imports: [ElementContainerDirective, CommonModule,
    ElementItemDirective, NotifyPipe],
  templateUrl: './notification-list-component.html',
  styleUrl: './notification-list-component.css',
})
export class NotificationListComponent {
    @Input()
  isFull: boolean = false;

  @Input()
  useNotifyFilter: string = "";


  notificationService:NotificationService;

  constructor(
    notificationService: NotificationService,
    private router: Router,
    private messageService: MessagingService,
    private panelManager: PanelManagerService) {
    this.notificationService = notificationService;
  }

  getImageUrl(notification: Notification): string {
    switch(notification.post.type) {
      case "BRAND_PROFILE":
      case "USER_PROFILE":
        return `${environment.image_service_url}/Images/profile/${notification.post.imageId}?app=${environment.app_name}`;
      case "REGULAR":
        return `${environment.image_service_url}/Images/public/${notification.post.imageId}`;
      default:
        return "non-profile.png"
    }
  }

  trimMessage(message: string): string {
    if(message.length > 122) return message.substring(0, 122) + "...";
    return message;
  }

  onHoverNotification(notification: Notification, onClick: boolean = false){
    if((!onClick && notification.status == "UNSEEN") || (onClick && notification.status == "UNREAD")) {
      this.notificationService.markNotifications([notification.notificationId], onClick, notification.post.time).subscribe({
        next: (obj: ResponseObj) => {
          if(!obj.id || !obj.id.includes(notification.notificationId))return;

          if(notification.status == "UNSEEN") {
            notification.status = "UNREAD";
          } else if(onClick && notification.status == "UNREAD"){
            notification.status = "READ";
          }
        }
      })
    }
  }

  onClickNotification(notification: Notification) {
    this.onHoverNotification(notification, true);
    switch(notification.post.category.toLowerCase()){
      case "connect":
        this.router.navigate(["/profile"], {
          queryParams: {
            id: notification.post.relevantId
          }
        });
      break;
      case "message": {
        let conv = this.messageService.conversations.find((conv) => conv.id == notification.post.relevantId);
        if(!conv){
          console.error("No conversation found for notification: " + notification.notificationId);
          return;
        }
        this.panelManager.openPanel(conv);
      }
      break;
      default:
        console.warn("Unhandled notification category: " + notification.post.category);
      break;
    
      
      // ToDo: handle other notification types according to specific app

      // End ToDo
    }


    this.notificationService.notificationClicked.next(undefined);
  }

  onDeleteNotification(notification: Notification) {
    this.notificationService.deleteNotifications([notification.notificationId]).subscribe({
      next: () => {

        this.notificationService.notifications.update((notifications) => {
          return notifications.filter((not: Notification) => {
            return notification.notificationId != not.notificationId;
          });
        });
      }
    })
  }
}
