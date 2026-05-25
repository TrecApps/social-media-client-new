import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, signal, WritableSignal } from '@angular/core';
import { Observable, shareReplay, throwError, of } from 'rxjs';
import { environment } from '../environment/environment';
import { BasicProfileFunction, FullPosting, Posting } from '../models/Content';
import { Education } from '../models/Education';
import { Profile, PostProfile, ProfileSearchResult, BasicProfile } from '../models/Profile';
import { SortedList } from '../models/SortedList';
import { WorkExpHolder } from '../models/WorkExperience';
import { AuthService } from './auth-service';
import { CALL_TYPE } from './EndpointConstants';
import { ResponseObj } from '../models/ResponseObj';

export interface SkillPost {
    level: number;
    detail: string;
}

type StringFunction = (val: string) => void;

@Injectable({
  providedIn: 'root',
})
export class ProfileService {
    authService: AuthService;
  constructor(as: AuthService, private client: HttpClient) {
    this.authService = as;
  }

  activeProfile: WritableSignal<Profile | undefined> = signal<Profile | undefined>(undefined);

  searchedProfile: WritableSignal<Profile | undefined> = signal<Profile | undefined>(undefined);

  presentProfile(): Profile | undefined {
    return this.searchedProfile() || this.activeProfile();
  }

  postProfile(data: PostProfile, brandId: string | undefined): Observable<ResponseObj> {
    let params = new HttpParams();
    if(brandId){
      params = params.append("brandId", brandId);
    }

    let ret = this.client.post<ResponseObj>(`${environment.sm_profile_url}Profile`, data, {
      params
    }).pipe(
      shareReplay({bufferSize: 1, refCount: true})
    );

    ret.subscribe({
      next: (obj: ResponseObj) => {
        if(obj.status == 201 && obj.id){
          let activeProfile = new Profile();
          activeProfile.aboutMe = data.aboutMe;
          activeProfile.aboutMeShort = data.aboutMe;
          activeProfile.pronouns = data.pronouns;
          activeProfile.pronounVisibility = data.pronounVisibility;
          activeProfile.id = obj.id.toString();
          this.activeProfile.set(activeProfile);
        }
      }
    })

    return ret;
  }
  

  searchProfiles(query: string, page: number, size: number): Observable<ProfileSearchResult[]> {
    let params = new HttpParams()
      .append("page", page)
      .append("size", size)
      .append("query", query);

    return this.client.get<ProfileSearchResult[]>(`${environment.sm_profile_url}Profile/search`, {
      params
    });
    
  }

  retrieveProfile(id: string) : Observable<Profile> {
    let ret = this.client.get<Profile>(`${environment.sm_profile_url}Profile/id/${id}`, ).pipe(
      shareReplay({bufferSize: 1, refCount: true})
    );

    ret.subscribe({
      next: (p: Profile) => this.searchedProfile.set(p)
    })

    return ret;

  }

  retrieveOwnProfile(): Observable<Profile> {
    let profileId = "";
      let list = this.authService.account;
    if(list){
    profileId = list.activeAccount?.id || list.mainAccount.id;
    } else return throwError(() => {
      let ret = new ResponseObj();
      ret.message = ("not logged on!");
      ret.status = 401;
      return ret;
    });

    let ret = this.client.get<Profile>(`${environment.sm_profile_url}Profile/id/${profileId}`).pipe(
      shareReplay({bufferSize: 1, refCount: true})
    );

    ret.subscribe({
      next: (p: Profile) => this.activeProfile.set(p)
    })

    return ret;
  }

  getResponseObject(s: number, message: string): ResponseObj {
    let ret = new ResponseObj();
    ret.status = s;
    ret.message = message;
    return ret;
  }

  editEnducation(callType: CALL_TYPE, obj: Education | undefined, id: string | undefined) : Observable<ResponseObj> {

    let url = `${environment.sm_profile_url}Profile/Education`;

    switch(callType){
      case CALL_TYPE.GET:
        return of(this.getResponseObject(415, "GET is not supported"));
      case CALL_TYPE.POST:
        if(!obj)
          return of(this.getResponseObject(400, "Education data needed"));
        return this.client.post<ResponseObj>(url, obj);
      case CALL_TYPE.PUT:
        if(!obj || !id)
          return of(this.getResponseObject(400, "Education data and id needed"));
        return this.client.put<ResponseObj>(`${url}/${id}`, obj);
      case CALL_TYPE.DELETE:
        if(!id)
          return of(this.getResponseObject(400, "Education id needed"));
        return this.client.delete<ResponseObj>(`${url}/${id}`);

    }
  }

  editExperience(callType: CALL_TYPE, obj: WorkExpHolder | undefined, id: string | undefined) : Observable<ResponseObj> {

    let url = `${environment.sm_profile_url}Profile/Experience`;

    switch(callType){
      case CALL_TYPE.GET:
        return of(this.getResponseObject(415, "GET is not supported"));
      case CALL_TYPE.POST:
        if(!obj)
          return of(this.getResponseObject(400, "Experience data needed"));
        return this.client.post<ResponseObj>(url, obj);
      case CALL_TYPE.PUT:
        if(!obj || !id)
          return of(this.getResponseObject(400, "Experience data and id needed"));
        return this.client.put<ResponseObj>(`${url}/${id}`, obj);
      case CALL_TYPE.DELETE:
        if(!id)
          return of(this.getResponseObject(400, "Experience id needed"));
        return this.client.delete<ResponseObj>(`${url}/${id}`);

    }
  }

  updateSkill(name: string, data: SkillPost): Observable<ResponseObj> {
    return this.client.put<ResponseObj>(`${environment.sm_profile_url}Profile/Skills/${name}`, data, );
  }

  removeSkill(name: string): Observable<ResponseObj> {
    return this.client.delete<ResponseObj>(`${environment.sm_profile_url}Profile/Skills/${name}`);
  }

  getDisplayName(id: string) : string | undefined {
    let result = localStorage.getItem(id);
    return result || undefined;
  }

  setDisplayName(id: string, displayName: string) {
    localStorage.setItem(id, displayName);
  }

  updateDisplayName(id: string, updater: BasicProfileFunction) {
    this.client.get<BasicProfile>(`${environment.sm_profile_url}Profile/basic/${id}`).subscribe({
      next: (val: BasicProfile) => {
        this.setDisplayName(id, JSON.stringify(val));
        updater(val);
      },
      error: (e) => console.error(`Failed to retrieve Profile Details for ${id}`, e)
    })
  }

  addFullPostingToSortedList(list: SortedList<FullPosting>, posting: Posting){
        let fullPosting: FullPosting = {
      posting,
      posterDetails: {
        id: '',
        displayName: '',
        shortAboutMe: undefined,
        pronouns: undefined
      },
      moduleName: undefined,
      ownerName: undefined,
      replies: []
    };
    let posterDetails = JSON.parse(this.getDisplayName(posting.posterId) || "{}");
    if(posterDetails.id && posterDetails.displayName){
      fullPosting.posterDetails = posterDetails;
    } else {
      this.updateDisplayName(posting.posterId, (val: BasicProfile) => {
        fullPosting.posterDetails = val;
      })
    }

    if(posting.ownerId){
      let profileOwner = JSON.parse(this.getDisplayName(posting.ownerId) || "{}");
      if(profileOwner.id && profileOwner.displayName){
        fullPosting.ownerName = profileOwner;
      } else {
        this.updateDisplayName(posting.ownerId, (val: BasicProfile) => {
          fullPosting.ownerName = val;
        })
      }
    }

    // ToDo: handle Module information

    // 
    list.add(fullPosting);
  }

  addFullPostingToList(list: FullPosting[], posting: Posting) {
    let fullPosting: FullPosting = {
      posting,
      posterDetails: {
        id: '',
        displayName: '',
        shortAboutMe: undefined,
        pronouns: undefined
      },
      moduleName: undefined,
      ownerName: undefined,
      replies: []
    };
    let posterDetails = JSON.parse(this.getDisplayName(posting.posterId) || "{}");
    if(posterDetails.id && posterDetails.displayName){
      fullPosting.posterDetails = posterDetails;
    } else {
      this.updateDisplayName(posting.posterId, (val: BasicProfile) => {
        fullPosting.posterDetails = val;
      })
    }

    if(posting.ownerId){
      let profileOwner = JSON.parse(this.getDisplayName(posting.ownerId) || "{}");
      if(profileOwner.id && profileOwner.displayName){
        fullPosting.ownerName = profileOwner;
      } else {
        this.updateDisplayName(posting.ownerId, (val: BasicProfile) => {
          fullPosting.ownerName = val;
        })
      }
    }

    // ToDo: handle Module information

    // 
    list.unshift(fullPosting);

  }

  //getPosting(id:)
  
}
