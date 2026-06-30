import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../environment/environment';
import { SocialMediaEvent, ProfileFilterList, PostFilterRequest } from '../models/MediaEvent';
import { ResponseObj } from '../models/standard';
import { AuthService } from './auth-service';

@Injectable({
  providedIn: 'root',
})
export class MediaEventService {
    constructor(private client: HttpClient){

  }


  retrieveEvents(category: string, page: number, size: number) : Observable<SocialMediaEvent[]> {
    let params = new HttpParams()
      .append("category", category)
      .append("page", page)
      .append("size", size);
    
    return this.client.get<SocialMediaEvent[]>(`${environment.sm_profile_url}Home`, {
      params
    });
  }

  getFilterList(): Observable<ProfileFilterList> {
    return this.client.get<ProfileFilterList>(`${environment.sm_profile_url}Home/filters`);
  }

  updateFilter(filterRequest: PostFilterRequest) : Observable<ResponseObj> {
    return this.client.post<ResponseObj>(`${environment.sm_profile_url}Home/filters`, filterRequest);
  }

  deleteFilter(filterRequest: PostFilterRequest) : Observable<ResponseObj> {
    return this.client.delete<ResponseObj>(`${environment.sm_profile_url}Home/filters`, {
      body: filterRequest
    });
  }
}
