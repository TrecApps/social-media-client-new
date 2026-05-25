import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../environment/environment';
import { ReactionPosting, ContentReactionEntry, ProfileReactionEntry } from '../models/Reactions';
import { ResponseObj } from '../models/standard';
import { AuthService } from './auth-service';

@Injectable({
  providedIn: 'root',
})
export class ReactionService {
    authService: AuthService;
  constructor(as: AuthService, private client: HttpClient) {
    this.authService = as;
  }

  postReaction(type:string, contentId: string, makePrivate: boolean = false): Observable<ResponseObj> {
    let data: ReactionPosting = new ReactionPosting();
    data.makePrivate = makePrivate;
    data.reactType = type;
    return this.client.post<ResponseObj>(`${environment.sm_content_url}Reactions/${contentId}`, data);
  }

  getReaction(contentId: string): Observable<ResponseObj> {

    return this.client.get<ResponseObj>(`${environment.sm_content_url}Reactions/count/${contentId}`);
  }

  removeReaction(contentId: string): Observable<ResponseObj> {
    return this.client.delete<ResponseObj>(`${environment.sm_content_url}Reactions/${contentId}`);
  }

  getContentReactions(contentId: string, page: number, size: number, type?: string): Observable<ContentReactionEntry[]> {
    let params = new HttpParams()
      .append("page", page)
      .append("size", size);
    if(type){
      params = params.append("type", type);
    }

    return this.client.get<ContentReactionEntry[]>(`${environment.sm_content_url}Reactions/list/${contentId}`)
  }

  getSelfReactions(page: number, size: number): Observable<ProfileReactionEntry[]> {
    let params = new HttpParams()
      .append("page", page)
      .append("size", size);
  

    return this.client.get<ProfileReactionEntry[]>(`${environment.sm_content_url}Reactions/mine`)
  }
}
