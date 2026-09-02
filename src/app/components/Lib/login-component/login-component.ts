import { AfterViewInit, Component, ElementRef, OnInit, signal, ViewChild, WritableSignal } from '@angular/core';
import { AuthService } from '../../../services/auth-service';
import { FormsModule } from '@angular/forms';
import { AuthAttempt, AuthMethodType, AuthRecordPublic } from '../../../models/account';
import { NavigationEnd, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { GlobalConstants } from '../../../common/GlobalConstants';
import { Subscription } from 'rxjs';
import { ElementContainerDirective } from '../../../directives/element-container-directive';
import { ElementItemDirective } from '../../../directives/element-item-directive';


class AuthRecordEntry {
  name: string;
  type: AuthMethodType;
  code: string;
  selected: boolean;


  constructor(method: AuthRecordPublic){
    this.name = method.name;
    this.type = method.type;

    this.code = "";
    this.selected = false;
  }

  toAttempt(): AuthAttempt {
    return {
      name: this.name,
      code: this.code
    }
  }
}

@Component({
  selector: 'app-login-component',
  imports: [CommonModule, FormsModule, ElementContainerDirective, ElementItemDirective],
  templateUrl: './login-component.html',
  styleUrl: './login-component.css',
})
export class LoginComponent implements OnInit, AfterViewInit{

  color1 ="white"
  color2 = "black"
  color3 = "gray"
  color4 = "yellow"
  color5 = "red"
  loginGradient = ""

  routerSubscription: Subscription;

  authMethodEntries: WritableSignal<AuthRecordEntry[] | undefined> = signal(undefined);

  constructor(private authService: AuthService, private router:Router){
    this.routerSubscription = router.events.subscribe((event) => {
        if(event instanceof NavigationEnd){
          let endEvent : NavigationEnd = event;
           
    
          if(endEvent.url == "/logon"){
            if(!this.authMethodEntries() && this.usernameInput){
              this.usernameInput.nativeElement.focus();
            }
          }
          
        }
      });
  }
  ngAfterViewInit(): void {
    if(!this.authMethodEntries() && this.usernameInput){
      this.usernameInput.nativeElement.focus();
    }
  }
  ngOnInit(): void {
    
    this.color1 = GlobalConstants.lightBlue
    this.color2 = GlobalConstants.salmon
    this.color3 = GlobalConstants.siteBackground
    this.color4 = GlobalConstants.crownYellow
    this.color5 = GlobalConstants.red
    this.loginGradient = 'linear-gradient(45deg,' + this.color4 + ' 50%, ' + this.color1 + ' 80%)'

    // this.authService.attemptRefresh(undefined);
    
    
  }

  @ViewChild('username')
  usernameInput: ElementRef<HTMLInputElement> | undefined;

  switchToCreate(){
    console.log("Switchng to Create")
    this.router.navigate(['/create']);
  }

  username = signal("");

  blankSignal = signal(0);

  invalidUsername: WritableSignal<boolean> = signal(false);

  stayLoggedIn: boolean = false;

  invalidCredentials: boolean = false;

  checking: WritableSignal<boolean> = signal(false);


  switchMethodEntry(entry: AuthRecordEntry){
    let authEntries = this.authMethodEntries();
    if(!authEntries) return;

    this.authMethodEntries.set(authEntries.map((entry1: AuthRecordEntry) => {
      if(entry1.name == entry.name){
        entry1.selected = !entry1.selected;
      }
      return entry1;
    }))
  }


  submitUsername(){


    if(this.checking()) return;
    this.checking.set(true);
    this.authService.attemptUsername(this.username(), (methodList: AuthRecordPublic[] | undefined) => {
      this.checking.set(false);
      if(!methodList){
        this.invalidUsername.set(true);
        this.authMethodEntries.set(undefined);
        return;
      }
      this.invalidUsername.set(false);
      this.authMethodEntries.set(methodList.map((value: AuthRecordPublic) => new AuthRecordEntry(value)));

    })
  }

  submitLogin(){
    let actEntries = this.authMethodEntries();
    if(!actEntries) return;
    this.invalidCredentials = false;

    this.authService.attemptLogin({
      stayLoggedIn: this.stayLoggedIn,
      credentials: actEntries
        .filter((value: AuthRecordEntry) => value.selected)
        .map((value: AuthRecordEntry) => value.toAttempt()),
      username: this.username()
    }, () => {
      this.invalidCredentials = true;
    })
  }

  get nonSelectedMethods(){
    return this.authMethodEntries()?.filter((value:AuthRecordEntry) => !value.selected) || []
  }

  get selectedMethods(): AuthRecordEntry[]{
    return this.authMethodEntries()?.filter((value:AuthRecordEntry) => value.selected) || []
  }

  get loginReady() : boolean{
    let methods = this.selectedMethods;
    if(methods.length == 0) return false;

    for(let method of methods){
      if(method.code.trim().length == 0){
        return false;
      }
    }
    return true;
  }
}
