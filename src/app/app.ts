import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterOutlet } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService, LoginResult } from './services/auth-service';
import { ConnectionService } from './services/conection-service';
import { ProfileService } from './services/profile-service';


interface LooseObject {
    [key: string]: any
}

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnDestroy , OnInit {
  protected readonly title = signal('social-media-client');

  // routeSubscription: Subscription;
  // prepProfile() {
  //   this.profileService.retrieveOwnProfile().subscribe({
  //     next: () => {
  //       if(this.urlService.params) {
  //         this.router.navigate([this.urlService.url], {
  //           queryParams: this.urlService.params
  //         })
  //       } else {
  //         this.router.navigate([this.urlService.url])
  //       }
  //     },
  //     error: () => {
  //       this.router.navigateByUrl("/registration");
  //     }
  //   })
  // }


  constructor(
    private router: Router, 
    private route: ActivatedRoute,
    private authService: AuthService, 
    private profileService: ProfileService,
    private connectionService: ConnectionService,
    // private urlService: UrlService,
    // private messageService: MessageService,
    // private notificationService: NotificationService
  ){

    

  }
  ngOnInit(): void {
    this.authService.attemptRefresh((res: LoginResult) => {});
  }


    ngOnDestroy(): void {
    // this.routeSubscription.unsubscribe();
    // this.notificationService.stopPolling();
  }
}
