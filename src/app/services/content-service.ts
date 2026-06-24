import { Injectable } from '@angular/core';

import { ContentPost, ContentPut, Posting } from "../models/Content";
import { Observable } from 'rxjs';
import { environment } from '../environment/environment';
import { HttpClient, HttpParams } from '@angular/common/http';
import { ResponseObj } from '../models/ResponseObj';
import { AuthService } from './auth-service';

export class ContentEdit {
  text: string = "";
  moduleId: string | undefined;
  contentId: string | undefined;
  profileId: string | undefined;
}

@Injectable({
  providedIn: 'root',
})
export class ContentService {
  edit: ContentEdit | undefined;
  parent: Posting | undefined;


  authService: AuthService;
  constructor(as: AuthService, private client: HttpClient) {
    this.authService = as;
  }


  postContent(posting: ContentPost): Observable<ResponseObj> {
    return this.client.post<ResponseObj>(`${environment.sm_content_url}Content`, posting);
  }

  editContent(edit: ContentPut): Observable<ResponseObj> {
    return this.client.put<ResponseObj>(`${environment.sm_content_url}Content`, edit);
  }

  deleteContent(id: string): Observable<ResponseObj> {
    return this.client.delete<ResponseObj>(`${environment.sm_content_url}Content`, {
      params: new HttpParams().append("contentId", id)
    });
  }

  getPosting(id: string): Observable<Posting> {
    return this.client.get<Posting>(`${environment.sm_content_url}Content/id/${id}`, );
  }

  getPostListByProfile(profileId: string, page: number, size: number): Observable<string[]> {
    let params: HttpParams = new HttpParams()
      .append("size", size)
      .append("page", page);

    return this.client.get<string[]>(`${environment.sm_content_url}Content/byProfile/${profileId}`, {
      params
    });
  }

  getPostListByModule(profileId: string, page: number, size: number): Observable<string[]> {
    let params: HttpParams = new HttpParams()
      .append("size", size)
      .append("page", page);

    return this.client.get<string[]>(`${environment.sm_content_url}Content/byModule/${profileId}`, {
      params
    });
  }

  getReplies(parentId: string, page: number, size: number): Observable<Posting[]> {
        let params: HttpParams = new HttpParams()
      .append("size", size)
      .append("page", page);

    return this.client.get<Posting[]>(`${environment.sm_content_url}Content/byParent/${parentId}`, {
      params
    });
  }

}
