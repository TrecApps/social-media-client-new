import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, signal, WritableSignal } from '@angular/core';
import { Notification, NotificationMarkPost } from '../models/Notification';
import { Observable, Subject } from 'rxjs';
import { environment } from '../environment/environment';
import { AuthService } from './auth-service';
import { ResponseObj } from '../models/ResponseObj';

export interface ConnectionSignal {
  profile: string;
  details: string;
}

@Injectable({
  providedIn: 'root',
})
export class NotificationService {

  notifications: WritableSignal<Notification[]> = signal([]);

  connectionCount: WritableSignal<number> = signal(0);
  messageCount: WritableSignal<number> = signal(0);
  regularCount: WritableSignal<number> = signal(0);


  page: WritableSignal<number> = signal(0);

  baseUrl: string;

  latestParams: HttpParams;

  latestTimestamp: Date | undefined;

  notificationClicked = new Subject();
  onNotificationClicked = this.notificationClicked.asObservable();

  notificationCounted = new Subject<Map<string, number>>();
  onNotificationCounted = this.notificationCounted.asObservable();

  constructor(private authService: AuthService, private client: HttpClient){
    this.baseUrl = environment.notifications_url;
    this.latestParams = new HttpParams()
        .append("appId", environment.app_name)
        .append("page", 0)
        .append("size", 20);
  }
  ngOnDestroy(): void {
    this.stopPolling();
  }

  messageSignal: WritableSignal<string> = signal<string>("");
  connectionSignal: WritableSignal<ConnectionSignal | undefined> = signal(undefined);

    private addLatest(newNotes: Notification[]){
    let curRecentId = this.notifications()[0].notificationId;

    for(let [index, note] of newNotes.entries()){
      if(note.notificationId == curRecentId){
        newNotes = newNotes.slice(0, index);
        break;
      }
    }

    for(let note of newNotes.reverse()){
      if(note.status == "UNSEEN"){
        switch(note.post.category){
          case "Message":
            this.messageCount.update((count) => count + 1);
            this.messageSignal.set(note.post.relevantId);
            break;
          case "Connect":
            this.connectionCount.update((count) => count + 1);
            this.connectionSignal.set({
              profile: note.post.relevantId,
              details: this.getConnectNoteDetail(note)
            })
            break;
          default:
            this.regularCount.update((count) => count + 1);
        }

        this.notifications.update((notifications) => [note, ...notifications]);
      }

      if(newNotes.length){
        this.latestTimestamp = newNotes[0].post.time;
      }
      
    }
  }

  getConnectNoteDetail(note: Notification): string {
    if(note.post.message.includes("accept")) return "accept";
    if(note.post.message.includes("follow")) return "follow";
    return "unknown";
  }

  pollerId: number = -1;

  initiateNotificationPolling(){
    this.pollerId = setInterval(() => this.updateLatest(), 15000);
  }

  stopPolling(){
    if(this.pollerId != -1){
      clearInterval(this.pollerId);
    }
    this.pollerId = -1;
  }

    deleteNotifications(notifications: string[]) : Observable<ResponseObj> {
    return this.client.delete<ResponseObj>(`${this.baseUrl}/Notifications/DeleteByList`, {
      body: notifications
    });
  }

  markNotifications(notifications: string[], read: boolean = false, time?:Date): Observable<ResponseObj> {
    let postBody: NotificationMarkPost = {
      notifications,
      status: read ? "READ" : "UNREAD"
    }
    let params = this.latestParams;
    if(time){
      params = params.append("time", time.toISOString());
    }

    return this.client.post<ResponseObj>(`${this.baseUrl}/Notifications/Mark`, postBody,{
      params
    });
  }

  updateLatest() {
    if(!this.authService.account()) return;
    let observe: Observable<Notification[]>;
    if(this.latestTimestamp){
      observe = this.client.get<Notification[]>(`${this.baseUrl}/Notifications/After`, {
        params: new HttpParams().append("appId", environment.app_name).append("time", this.latestTimestamp.toISOString())
      })
    } else {
      observe = this.client.get<Notification[]>(`${this.baseUrl}/Notifications`, {
        params: this.latestParams
      })
    }
    observe.subscribe({
      next: (newNotes: Notification[]) => {

        for(let note of newNotes){
          let timeStr = note.post.time.toString();
          //if(timeStr.endsWith("+0000")){
          //  timeStr = timeStr.slice(0, -5).trim();// + "+00:00";
          //}
          note.post.time = new Date(timeStr);
        }

        if(this.notifications().length == 0){
          this.notifications.update(() => newNotes);

          if(newNotes.length){
            this.latestTimestamp = newNotes[0].post.time;
          }

          for(let note of this.notifications()){
            if(note.status == "UNSEEN"){
              switch(note.post.category){
                case "Message":
                  this.messageCount.update((count) => count + 1);
                  this.messageSignal.set(note.post.relevantId);
                  break;
                case "Connect":
                  this.connectionCount.update((count) => count + 1);
                  this.connectionSignal.set({
                    profile: note.post.relevantId,
                    details: this.getConnectNoteDetail(note)
                  })
                  break;
                default:
                  this.regularCount.update((count) => count + 1);
              }
            }
          }
        } else this.addLatest(newNotes);


        // Send a signal for the total types
        let numbers = new Map<string, number>();

        for(let note of this.notifications()){
          if(note.status != "UNSEEN") continue;


          let curNumber = numbers.get(note.post.category);
          if(!curNumber) curNumber = 0;
          numbers.set(note.post.category, curNumber + 1);
        }

        this.notificationCounted.next(numbers);

      }
    })
  }
}
