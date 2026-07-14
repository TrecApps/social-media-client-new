import { Injectable, signal, WritableSignal } from '@angular/core';
import { AccountList, AuthRecordPublic, LoginRequest, StyleSpec } from '../models/account';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../environment/environment';
import { ResponseObj } from '../models/standard';
import { Router } from '@angular/router';
import { StylesService } from './styles-service';

export enum LoginResult{
  CLIENT_FAILURE,     // Login failed due to invalid credientials
  SERVER_FAILURE,     // Login failed due to server or connection issues
  SUCCESS,            // Login was successful, no further login required
  SUCCESS_MFA         // Login was successful, but additional verification required
}

export type AuthMethodListReciever = (authMethods: AuthRecordPublic[] | undefined) => void;

export type LoginResultHandler = (res: LoginResult)=> void;

@Injectable({
  providedIn: 'root',
})
export class AuthService {

  account: WritableSignal<AccountList | undefined> = signal<AccountList | undefined>(undefined);

  onLoginSuccess() {

    if(this.account()?.mainUserAccount?.extensions?.styles)
        {
          let targetStyle: StyleSpec = this.account()?.mainUserAccount?.extensions?.styles[environment.app_name] || this.account()?.mainUserAccount?.extensions?.styles.main || {
            style: "default",
            useDark: false
          };
          this.styleService.setStyle(targetStyle.style);
          this.styleService.setDarkMode(targetStyle.useDark);
        }

    this.router.navigate(["/user"]);

    
  }

  constructor(private client: HttpClient, private router: Router, private styleService: StylesService){

  }

  get nonProfilePic(): string {
    return "Unknown_Profile.png";
  }

  get profilePic(): string {
    if(!this.account()) return this.nonProfilePic;
    return environment.image_service_url + "/Images/profile/" + this.account()?.mainAccount.id;
  }

  attemptUsername(username: string, reciever: AuthMethodListReciever) {

    this.client.get<AuthRecordPublic[]>(`${environment.user_service_url}/Login/username/${username}`)
    .subscribe({
      next: (value: AuthRecordPublic[]) => reciever(value),
      error: (err: any) => {
        // 
        reciever(undefined)
      }
    })
  }

  attemptRefresh(func: LoginResultHandler | undefined): void {
    // If we have a cookie, then we'll send it to the refresh Endpoint
    let params = new HttpParams().append("app", environment.app_name);

    this.client.get<AccountList>(`${environment.user_service_url}/Login/refresh`, {
      withCredentials: true,
      params
    }).subscribe(
    {
      next: (value: AccountList) => {
        this.account.set(value);

        // To-Do: Handle login Success
        this.onLoginSuccess();

        
      },
      error:  (e) => {

        this.router.navigateByUrl("/logon");
      }
    })
  }


  attemptLogin(loginRequest: LoginRequest, failureCondition: VoidFunction){
    this.client.post<AccountList>(`${environment.user_service_url}/Login`, loginRequest).subscribe({
      next: (value: AccountList) => {
        this.account.set(value);

        // To-Do: Handle login Success
        this.onLoginSuccess();
      },
      error: failureCondition
    })
  }

  logout() {
    this.client.delete<ResponseObj>(`${environment.user_service_url}/Login`).subscribe({
      next: () => {
        this.account.set(undefined);
        this.router.navigate(['/logon'])
      }
    })
  }

}
