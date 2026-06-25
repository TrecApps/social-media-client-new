import { CommonModule } from '@angular/common';
import { Component, ViewChild } from '@angular/core';
import { NavBarComponent, NavClickDetails, ProfileItemGroup } from '../../Lib/nav-bar-component/nav-bar-component';
import { PopupComponent } from '../../Lib/popup-component/popup-component';
import { ColorOption, ColorPanelComponent } from '../color-panel/color-panel.component';
import { HttpParams, HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { environment } from '../../../environment/environment';
import { ResponseObj } from '../../../models/standard';
import { NavOption, NavOptionShow } from '../../../pipes/nav-pipe';
import { AuthService } from '../../../services/auth-service';
import { StylesService } from '../../../services/styles-service';
import { SearchBarComponent } from '../search-bar-component/search-bar-component';

@Component({
  selector: 'app-top-bar-component',
  imports: [CommonModule, SearchBarComponent, //NotificationListComponent,
    NavBarComponent, PopupComponent, ColorPanelComponent],
  templateUrl: './top-bar-component.html',
  styleUrl: './top-bar-component.css',
})
export class TopBarComponent {
    authService: AuthService;

  navOptions: NavOption[];

  

  logo: string = environment.logo_image;

    profileItemGroups: ProfileItemGroup[] = [
    {
      itemList: [
        {
          item: 'cStyle',
          displayItem: 'App Style'
        },
        {
          item: 'brand',
          displayItem: 'View Brand Accounts'
        }
      ]
    }, {
      itemList: [
        {
          item: 'logout',
          displayItem: 'Logout'
        }
      ]
    }
  ]

  @ViewChild("navBar")
  navBar!: NavBarComponent;

  onProfilePanelSelect(item:string) {
    if(item == 'logout'){
      this.authService.logout();
    } else if(item == 'cStyle'){
      this.showStylePopup = true;
    } else if(item == 'brand'){
      this.navBar.onFocusBrands();
    }
  }

  showStylePopup: boolean = false;
  styleUpdating: boolean = false;

  updateStyle(){

    if(this.styleUpdating) return;
      this.styleUpdating = true;

    let targetStyle = this.ss.style();
    if(targetStyle.startsWith('dark-'))
      targetStyle = targetStyle.substring(5);

    this.client.patch<ResponseObj>(`${environment.user_service_url}Users/styles`, {
        style: targetStyle,
        useDark: this.ss.isDark
    
    }, {
      params: new HttpParams().append("app", environment.app_name)
    }).subscribe({
      next: (val: ResponseObj) => {
        this.styleUpdating = false;
        this.colorChanged = false;
      },
      error: ()=> {
        this.styleUpdating = false;
        this.colorChanged = false;
      }
    })
  }

    colorList: ColorOption[] = [
    {
      colorStyle: '#d1d1d1',
      styleName: 'default'
    },{
      colorStyle: '#ff0000ff',
      styleName: 'red'
    },{
      colorStyle: 'rgb(0, 171, 255)',
      styleName: 'blue'
    },{
      colorStyle: 'rgb(8, 223, 41)',
      styleName: 'green'
    },{
      colorStyle: 'rgb(255, 239, 1)',
      styleName: 'yellow'
    },{
      colorStyle: 'rgb(255, 120, 1)',
      styleName: 'orange'
    },{
      colorStyle: 'rgb(221, 99, 255)',
      styleName: 'purple'
    },{
      colorStyle: 'rgb(255, 59, 243)',
      styleName: 'pink'
    }
  ]

  colorChanged: boolean = false;

  onColorSelect(styleColor: string){
    this.ss.setStyle(styleColor);
    this.colorChanged = true;
  }
  onUseDarkChecked(event: Event) {
    const checkbox = event.target as HTMLInputElement;
    this.colorChanged = true;

    this.ss.setDarkMode(checkbox.checked);
  }
  
  ss: StylesService;

  updateSignal: Subscription | undefined;

  showNotifications: boolean = false;
  useNotifyFilter: string = "";

  constructor(
    authService: AuthService, 
    private router:Router, 
    ss: StylesService, 
    private client: HttpClient,
    // private notificationService: NotificationService,
    // private messageService: MessageService
  ){
    this.authService = authService;
    this.ss = ss;

    this.navOptions = [
      // Basic routing
      {
        displayText: 'Home',
        title: 'home',
        showOption: NavOptionShow.BASIC_DESKTOP,
        baseImg: 'assets/w-home.png',
        notifyCount: 0
      },
      {
        displayText: 'Your Profile',
        title: 'profile',
        showOption: NavOptionShow.BASIC_DESKTOP,
        baseImg: 'non-profile.png',
        notifyCount: 0
      },
      // Notification Bar
      {
        displayText: 'Connections',
        title: 'connect',
        showOption: NavOptionShow.OPTION_DESKTOP,
        baseImg: 'assets/icons/w-friends.png',
        hoverImg: 'assets/icons/b-friends.png',
        focusImg: 'assets/icons/b-friends.png',
        notifyCount: 0
      },
      {
        displayText: 'Messages',
        title: 'message',
        showOption: NavOptionShow.OPTION_DESKTOP,
        baseImg: 'assets/icons/w-message.png',
        hoverImg: 'assets/icons/b-message.png',
        focusImg: 'assets/icons/b-message.png',
        notifyCount: 0
      },
      {
        displayText: 'Notifications',
        title: 'notify',
        showOption: NavOptionShow.OPTION_DESKTOP,
        baseImg: 'assets/icons/w-bell.png',
        hoverImg: 'assets/icons/b-bell.png',
        focusImg: 'assets/icons/b-bell.png',
        notifyCount: 0
      }
    ]
  }
  ngOnDestroy(): void {
    if(this.notifyOff) this.notifyOff.unsubscribe();
    if(this.updateSignal) this.updateSignal.unsubscribe();
  }

  retrieveNavOption(title: string): NavOption | undefined {
    for(let opt of this.navOptions){
      if(opt.title == title) return opt;
    }
    return undefined;
  }

  resetNavOptionNotifyCount(){
    for(let opt of this.navOptions){
      opt.notifyCount = 0;
    }
  }

  notifyOff: Subscription | undefined;

  ngOnInit(): void {
    // // Know when a notification is clicked to turn off
    // this.notifyOff = this.notificationService.onNotificationClicked.subscribe(() => this.showNotifications = false);

    // this.updateSignal = this.notificationService.onNotificationCounted.subscribe((notificationCounts: Map<string, number>) => {
    //   this.resetNavOptionNotifyCount();

    //   notificationCounts.forEach((count: number, category: string) => {
    //     let c = category.toLowerCase();
    //     let navOption: NavOption | undefined;
    //     if(c == "message"){
    //       navOption = this.retrieveNavOption("message");
    //     } else if(c == "connect"){
    //       navOption = this.retrieveNavOption("connect");
    //     }
    //     // ToDo - additional categories depending on the usique app

    //     // End ToDo
    //     else {
    //       navOption = this.retrieveNavOption("notify");
    //     }


    //     if(navOption) {
    //       if(!navOption.notifyCount) navOption.notifyCount = 0;
    //       navOption.notifyCount += count;
    //     }
    //   });
    // })
  }



  onNavigate(details: NavClickDetails){
    this.showNotifications = true;

    if(details.title == 'connect' || details.title == 'message'){
      this.useNotifyFilter = details.title;
    } else if(details.title == 'notify') {
      this.useNotifyFilter = "";
    } else {
      this.showNotifications = false;
      this.router.navigateByUrl('/' + (details.navLink || details.title));
    }
  }

  prepLogin(){
    this.router.navigateByUrl('/Logon')
  }
}
