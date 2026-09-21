import { Pipe, PipeTransform } from '@angular/core';
import { Notification } from '../models/Notification';

@Pipe({
  name: 'notify',
})
export class NotifyPipe implements PipeTransform {
    transform(notifications: Notification[], filter: string): Notification[] {
    if(filter.length) return notifications.filter((notification: Notification) => {
      return notification.post.category.toLowerCase() == filter;
    });
    return notifications;
  }
}
