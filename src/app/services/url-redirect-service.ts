import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class UrlRedirectService {
  url: string = "/profile";

  params: any | undefined;

  constructor() { }
}
