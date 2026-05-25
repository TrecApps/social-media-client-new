import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BrandSearchResult } from '../models/Brand';

@Injectable({
  providedIn: 'root',
})
export class BrandService {
  
  constructor(
    private client: HttpClient,
//    private router: Router  
  ) {}


  searchByNameAndType(baseUrl: string, name:string, type: string): Observable<BrandSearchResult[]>{
    let params = new HttpParams().append("query", name).append("resourceType", type);

    return this.client.get<BrandSearchResult[]>(`${baseUrl}brands-api`, {
      params
    })
  }

  searchByName(baseUrl: string, name:string): Observable<BrandSearchResult[]>{
    let params = new HttpParams().append("query", name);

    return this.client.get<BrandSearchResult[]>(`${baseUrl}brands-api`, {
      params
    })
  }

  // selectEntry(baseUrl: string, bi: BrandInfo, onContent: Function, onMetadata: Function){


  //   this.client.get(`${baseUrl}search/resourceContent/${bi.id}`, {responseType: "text"}).subscribe({
  //     next: (contents: string) => {
  //       onContent(contents);
  //     }
  //   })

  //   this.client.get<ResourceMetadata>(`${baseUrl}search/resourceMetaData/${bi.id}`).subscribe({
  //     next: (md: ResourceMetadata) => {
  //       onMetadata(md);
  //     }
  //   })
  // }
}
