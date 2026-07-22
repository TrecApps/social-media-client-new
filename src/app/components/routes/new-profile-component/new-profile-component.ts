import { Component, signal, WritableSignal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, NavigationEnd } from '@angular/router';
import { Subscription, shareReplay, delay, Observable } from 'rxjs';
import { ElementContainerDirective } from '../../../directives/element-container-directive';
import { ElementItemDirective } from '../../../directives/element-item-directive';
import { environment } from '../../../environment/environment';
import { PostProfile, Profile } from '../../../models/Profile';
import { ProfileService } from '../../../services/profile-service';
import { UrlRedirectService } from '../../../services/url-redirect-service';
import { Account } from '../../../models/account';

@Component({
  selector: 'app-new-profile-component',
  imports: [FormsModule,
      ElementContainerDirective, ElementItemDirective],
  templateUrl: './new-profile-component.html',
  styleUrl: './new-profile-component.css',
})
export class NewProfileComponent {
    profileService: ProfileService;

  routeSubscription: Subscription;
  checkingProfile: WritableSignal<boolean> = signal<boolean>(false);

  newProfile: PostProfile;

  appName: string;

  createUser: boolean = false; // Ignored if no Brand Account is active, used to make a user profile if true and logged on as Brand

  availablePronouns: string[] = [
    "(he/him)",
    "(she/her)",
    "(they/them)"
  ];

  pronounVisibility: string [] = [
    "SHOW_ALL",
    "SHOW_ON_PAGE",
    "SHOW_ON_POSTS",
    "DO_NOT_SHOW"
  ]

  doRedirect(){
    if(this.urlService.params) {
      this.router.navigate([this.urlService.url], {
        queryParams: this.urlService.params
      })
    } else {
      this.router.navigate([this.urlService.url])
    }
  }

  get accountList(): Account[] {
    return this.profileService.authService.account()?.brandAccounts || [];
  }


  constructor(ps: ProfileService, private router: Router, private urlService: UrlRedirectService){
    this.profileService = ps;

    this.newProfile = new PostProfile();
    this.appName = environment.app_name;

    this.routeSubscription = this.router.events.subscribe((event) => {
      if(!(event instanceof NavigationEnd)) return;

      let navEnd = event as NavigationEnd;

      if(!navEnd.url.startsWith("/newProfile")) return;

      // Check to see if we need to authenticate
      if(!this.profileService.authService.account) {
        this.router.navigateByUrl("/login")
        return;
      }

      // Check to see if we currently have a profile
      if(this.profileService.authService.account()?.currentAccount) {
        this.doRedirect();
        return;
      }

      this.checkingProfile.set(true);

      this.profileService.retrieveOwnProfile()
        .pipe(shareReplay({bufferSize: 1, refCount: true}))
        .pipe(delay(500)) // Delay our reaction so that the other subscripiton runs first
        .subscribe({
          next: () => {
            this.checkingProfile.set(false);
            this.doRedirect();
          },
          error: () => this.checkingProfile.set(false)
        });

        this.newProfile = new PostProfile();

    })
  }

  ngOnDestroy(): void {
    this.routeSubscription.unsubscribe();
  }

  imageFallback($event: ErrorEvent) {
    let target = $event.target as HTMLImageElement;
    target.src = "non-profile.png";
  }
  getProfileImageLink(): string {
    if(!this.profileService.activeProfile()?.id) return "non-profile.png";
    return `${environment.sm_profile_url}Profile/pic/${this.profileService.activeProfile()?.id}`;
  }
  

  checkProfile() {
    if(!this.createUser) return;

    this.checkingProfile.set(true);

    let obs: Observable<Profile>

    obs = this.profileService.retrieveOwnProfile();
    

    obs.pipe(delay(500))
      .subscribe({
        next: () => {
          this.checkingProfile.set(false);
          this.router.navigateByUrl("/profile");
        },
        error: () => this.checkingProfile.set(false)
      });
    
  }



  generateProfile(){

    this.checkingProfile.set(true);

    this.profileService.postProfile(this.newProfile, this.profileService.authService.account()?.currentAccount?.id).subscribe({
      next:() => {
        this.checkingProfile.set(false);
        this.router.navigateByUrl("/profile");
      },
      error: () => {
        // ToDo - alert user to error
        this.checkingProfile.set(false);
      }
    })
  }
}
