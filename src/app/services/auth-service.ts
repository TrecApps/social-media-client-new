import { Injectable } from '@angular/core';
import { AccountList, AuthRecordPublic, LoginRequest, StyleSpec } from '../models/account';
import { HttpClient } from '@angular/common/http';
import { environment } from '../environment/environment';
import { ResponseObj } from '../models/standard';
import { Router } from '@angular/router';
import { StylesService } from './styles-service';

export type AuthMethodListReciever = (authMethods: AuthRecordPublic[] | undefined) => void;

@Injectable({
  providedIn: 'root',
})
export class AuthService {

  account: AccountList | undefined;

  onLoginSuccess() {

    if(this.account?.mainUserAccount?.extensions?.styles)
        {
          let targetStyle: StyleSpec = this.account?.mainUserAccount?.extensions?.styles[environment.app_name] || this.account?.mainUserAccount?.extensions?.styles.main || {
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
    if(!this.account) return this.nonProfilePic;
    return environment.image_service_url + "/Images/profile/" + this.account.mainAccount.id;
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

  attemptLogin(loginRequest: LoginRequest, failureCondition: VoidFunction){
    this.client.post<AccountList>(`${environment.user_service_url}/Login`, loginRequest).subscribe({
      next: (value: AccountList) => {
        this.account = value;

        // To-Do: Handle login Success
        this.onLoginSuccess();
      },
      error: failureCondition
    })
  }

  logout() {
    this.client.delete<ResponseObj>(`${environment.user_service_url}/Login`).subscribe({
      next: () => {
        this.account = undefined;
        this.router.navigate(['/logon'])
      }
    })
  }

}
