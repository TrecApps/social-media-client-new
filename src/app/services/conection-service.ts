import { Injectable } from '@angular/core';
import { BasicProfile } from '../models/Profile';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environment/environment';
import { ResponseObj } from '../models/standard';
import { AuthService } from './auth-service';
import { ProfileService } from './profile-service';

export type ConnectionAction = "follow" | "approve" | "unfollow";
export type ConnectionType = "followers" | "followees";

export interface ConnectionLink {
    follower: string;
    followee: string;
}

export interface ConnectionEntry {
    id: ConnectionLink;
    made: Date;
    accepted: Date | undefined;
    oneWay: boolean;             // Set true when a Brand Profile is involved, false if both parties are User Profiles

}

export interface ProfileConnection {
  asFollower: ConnectionEntry | undefined;
  asFollowee: ConnectionEntry | undefined;
}

export interface ConnectionDetails {
  entry: ConnectionEntry;
  profileDetails: BasicProfile;
}

export interface ConnectionSort {
  followers: ConnectionDetails[];
  followees: ConnectionDetails[];
  outRequests: ConnectionDetails[];
  inRequests: ConnectionDetails[];
  twoWayConnections: ConnectionDetails[];
}

@Injectable({
  providedIn: 'root',
})
export class ConnectionService {
    connections: ConnectionSort = {
    followees: [],
    followers: [],
    outRequests: [],
    inRequests: [],
    twoWayConnections: []
  };

  clearConnections() {
    this.connections = {
      followees: [],
      followers: [],
      outRequests: [],
      inRequests: [],
      twoWayConnections: []
    };
  }

  constructingList: boolean = false;

  hasMoreFollowers = true;
  hasMoreFollowees = true;
  followeePage: number = 0;
  followerPage: number = 0;

  constructList(){
    
    if(this.constructingList) return;
    this.constructingList = true;

    this.hasMoreFollowers = true;
    this.hasMoreFollowees = true;

    this.followeePage = 0;
    this.followerPage = 0;

    this.connections = {
      followees: [],
      followers: [],
      outRequests: [],
      inRequests: [],
      twoWayConnections: []
    };

    this.constructFolloweeList();
    this.constructFollowerList();

  }



  isListComplete(){
    if(this.hasMoreFollowers || this.hasMoreFollowees) return;

    this.constructingList = false;
  }

  // private getNonSelfProfile(id1: string, id2: string): string {
  //   let profile = this.profileService.activeProfile?.id || "";
  //   if(!profile.length) return profile;

  //   return id1 == profile ? id2 : id1;
  // }

  private constructFollowerList() {
    if(!this.hasMoreFollowers) {
      this.isListComplete();
      return;
    }

    this.retrieveConnections("followers",this.followerPage, 100).subscribe({
      next: (entries: ConnectionEntry[]) => {


        this.followerPage++;
        entries.forEach((entry: ConnectionEntry) => {
          let posterDetails = JSON.parse(this.profileService.getDisplayName(entry.id.follower) || "{}");
          if(posterDetails.id && posterDetails.displayName){
            this.updateList({
              entry,
              profileDetails: posterDetails
            }, true);
          } else {
            this.profileService.updateDisplayName(entry.id.follower, (val: BasicProfile) => {
              this.updateList({
                entry,
                profileDetails: val
              }, true);
            })
          }
        });

        if(entries.length < 100){
          this.hasMoreFollowers = false;
          this.isListComplete();
          return;
        }

        this.constructFollowerList();

      },
      error: () => {
        this.hasMoreFollowers = false;
        this.isListComplete();
        // ToDo: alert or retry
      }
    })
  }

  private constructFolloweeList() {
    if(!this.hasMoreFollowees) {
      this.isListComplete();
      return;
    }

    this.retrieveConnections("followees",this.followeePage, 100).subscribe({
      next: (entries: ConnectionEntry[]) => {


        this.followeePage++;
        entries.forEach((entry: ConnectionEntry) => {
          let posterDetails = JSON.parse(this.profileService.getDisplayName(entry.id.followee) || "{}");
          if(posterDetails.id && posterDetails.displayName){
            this.updateList({
              entry,
              profileDetails: posterDetails
            }, false);
          } else {
            this.profileService.updateDisplayName(entry.id.followee, (val: BasicProfile) => {
              this.updateList({
                entry,
                profileDetails: val
              }, false);
            })
          }
        });

        if(entries.length < 100){
          this.hasMoreFollowees = false;
          this.isListComplete();
          return;
        }

        this.constructFolloweeList();

      },
      error: () => {
        this.hasMoreFollowees = false;
        this.isListComplete();
        // ToDo: alert or retry
      }
    })
  }

  private updateList(details: ConnectionDetails, isFollower: boolean) {
    if(details.entry.accepted){
      this.connections.twoWayConnections.push(details);
      return;
    }

    if(details.entry.oneWay){
      if(isFollower){
        this.connections.followers.push(details);
      } else {
        this.connections.followees.push(details);
      }
    } else {
      if(isFollower){
        this.connections.inRequests.push(details);
      } else {
        this.connections.outRequests.push(details);
      }
    }
  }


  constructor(private authService: AuthService, private client: HttpClient, private profileService: ProfileService)  {}

  editConnection(action: ConnectionAction, profileId: string) : Observable<ResponseObj> {
    return this.client.get<ResponseObj>(`${environment.sm_profile_url}Connections/${action}`, {
       params: new HttpParams().append("profileId", profileId)
    });
  }

  retrieveConnections(type: ConnectionType, page: number, size: number): Observable<ConnectionEntry[]> {
    let params = new HttpParams()
      .append("size", size)
      .append("page", page);
    
    return this.client.get<ConnectionEntry[]>(`${environment.sm_profile_url}Connections/${type}`, {
       params
    })
  }

  retrieveSingleConnection(id: string): Observable<ProfileConnection> {
    return this.client.get<ProfileConnection>(`${environment.sm_profile_url}Connections/with/${id}`)
  }
}
