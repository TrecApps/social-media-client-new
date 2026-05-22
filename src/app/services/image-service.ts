import { HttpClient, HttpHandler, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ImageEntry, ImageUploadMode, ImageRecord, ImageVisibility } from '../models/images';
import { ResponseObj } from '../models/standard';
import { environment } from '../environment/environment';
import { AuthService } from './auth-service';

@Injectable({
  providedIn: 'root',
})
export class ImageService {

  constructor(private client: HttpClient, private authService: AuthService) {
    
  }

  get creator(): string {
    return this.authService.account?.mainAccount.id || "";
  }

  postImage(entry: ImageEntry, uploadMode: ImageUploadMode): Observable<ResponseObj>{
    let data = entry.src.split(',', 2);

    let type = data[0].replace("data:", "").replace(";base64", "");
    let params = new HttpParams().appendAll({
      mode: ImageUploadMode[uploadMode],
      app: entry.record.app
    })

    if(entry.record.name.trim().length){
      params = params.append("name", entry.record.name.trim());
    }

    if(entry.record.defaultCrop){
      params = params.append("crop", entry.record.defaultCrop.trim());
    }

    if(entry.record.album.length){
      params = params.append("album", entry.record.album[0].trim());
    }


    return this.client.post<ResponseObj>(`${environment.image_service_url}/Image-API`, data[1].trim(), {
      headers: new HttpHeaders().append("Content-Type", entry.record.subType),
      params
    })
  }

  setAsProfile(id: string, app: string): Observable<ResponseObj>{
    let params = new HttpParams().append("app", app);

    return this.client.put<ResponseObj>(`${environment.image_service_url}/Image-API/${id}`, null, {
      params
    })
  }

  updateCrop(id: string, crop: string | undefined): Observable<ResponseObj> {
    return this.client.patch<ResponseObj>(`${environment.image_service_url}/Image-API`, {
      field: "crop", value: crop
    }, {
      params: new HttpParams().append("id", id)
    })
  }

  updateAlbum(id: string, album: string | undefined): Observable<ResponseObj> {
    return this.client.patch<ResponseObj>(`${environment.image_service_url}/Image-API`, {
      field: "album", value: album
    }, {
      params: new HttpParams().append("id", id)
    })
  }

  retrieveImageList(page: number, size: number, app: string | undefined, album: string | undefined): Observable<ImageRecord[]> {
    let params = new HttpParams().appendAll({
      page, size
    });

    if(app){
      params = params.append("app", app);
    }
    if(album) {
      params = params.append("album", album);
    }

    return this.client.get<ImageRecord[]>(`${environment.image_service_url}/Image-API`, {
      params
    });
  }

  // Hint, use "whole" for the "crop" parameter to prevent any cropping
  retrieveImageAsBase64(id: string, crop: string | undefined, allowAdult: boolean = false): Observable<ResponseObj> {
    let params = new HttpParams().append("allowAdult", allowAdult);
    if(crop){
      params = params.append("crop", crop);
    }
    return this.client.get<ResponseObj>(`${environment.image_service_url}/Image-API/data/${id}`, {
      params
    })
  }

  updateVisibility(id: string, visibility: ImageVisibility) : Observable<ResponseObj> {
    return this.client.patch<ResponseObj>(`${environment.image_service_url}/Image-API`, {
      field: "visibility", value: ImageVisibility[visibility]
    }, {
      params: new HttpParams().append("id", id)
    })
  }

  handleDeletion(record: ImageRecord): Observable<ResponseObj> {
    let url = record.deleteOn ?
    `Image-API/cancel/${record.id}` : `Image-API/${record.id}`;

    return this.client.delete<ResponseObj>(`${environment.image_service_url}/${url}`)
  }

}
