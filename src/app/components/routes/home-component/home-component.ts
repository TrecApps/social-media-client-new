import { Component } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { Subscription } from 'rxjs';
import { environment } from '../../../environment/environment';
import { FullPosting, Posting } from '../../../models/Content';
import { SocialMediaEvent } from '../../../models/MediaEvent';
import { AuthService } from '../../../services/auth-service';
import { ContentEdit } from '../../../services/content-service';
import { ProfileService } from '../../../services/profile-service';
import { MediaEventService } from '../../../services/media-event-service';
import { ElementContainerDirective } from '../../../directives/element-container-directive';
import { ElementItemDirective } from '../../../directives/element-item-directive';
import { BottomTickerComponent } from '../../Lib/bottom-ticker-component/bottom-ticker-component';
import { ConnectionListComponent } from '../../repeats/connection-list-component/connection-list-component';
import { MediaEventComponent } from '../../repeats/media-event-component/media-event-component';
import { ContentEditorComponent } from '../../singulars/content-editor-component/content-editor-component';
import { TopBarComponent } from '../../singulars/top-bar-component/top-bar-component';

@Component({
  selector: 'app-home-component',
  imports: [TopBarComponent, ContentEditorComponent,
    BottomTickerComponent,// ContentComponent,
    MediaEventComponent,
    ElementContainerDirective, ElementItemDirective,
    ConnectionListComponent],
  templateUrl: './home-component.html',
  styleUrl: './home-component.css',
})
export class HomeComponent {
    routeSubscription: Subscription;
  profileService: ProfileService;
  authService: AuthService;

  appName: string = environment.app_name;

  postList: FullPosting[] = [];

  edit: ContentEdit | undefined;
  parent: FullPosting | undefined;


  outOfPosts: boolean = false;

  mediaEvents: SocialMediaEvent[] = [];

  currentCategory: string = "Following"

  constructor(
    private router: Router, 
    private mediaEventService: MediaEventService,
    profileService: ProfileService, 
    authService: AuthService
  ){
    this.profileService = profileService;
    this.authService = authService;

    this.routeSubscription = router.events.subscribe((event) => {
      if(!(event instanceof NavigationEnd)) return;
      let navEvent = event as NavigationEnd;

      if(!navEvent.url.startsWith("/home")) return;

      // If we are not logged in, the auth service will automatically route to the login page.
      // We need to make sure we have a profile
      if(profileService.authService.account && !profileService.activeProfile) {
        profileService.retrieveOwnProfile().subscribe({
          error: () => {
            router.navigateByUrl("/registration");
          }
        })
      }
    })

    this.routeSubscription = this.router.events.subscribe((event) => {
            if(!(event instanceof NavigationEnd)) return;

      let navEnd = event as NavigationEnd;

      if(!navEnd.url.startsWith("/home")) return;

      if(!this.profileService.authService.account)
      {
        router.navigateByUrl("/logon")
        return;
      }


      this.currentCategory = "Following";
      this.mediaEvents = [];
      this.page = 0;

    })

  }
  ngOnDestroy(): void {
    this.routeSubscription.unsubscribe();
  }

  size: number = 15;
  page: number = 0;

  retrievePosts(isNew: boolean) {
    this.mediaEventService.retrieveEvents(this.currentCategory, this.page, this.size).subscribe({
      next: (event: SocialMediaEvent[]) => {
        this.mediaEvents = this.mediaEvents.concat(event);
        this.page++;
        if(event.length < this.size){
          this.outOfPosts = true;
        }
      }
    })
  }

  handlePostResult(posting: Posting){
    let socialMediaEvent: SocialMediaEvent = {
      id: {
        profile: '',
        randomId: '',
        category: '',
        added: new Date()
      },
      contentId: posting.id,
      parentContentId: this.parent?.posting.id,
      type: '',
      otherProfile: undefined
    }
    this.parent = undefined;

    this.mediaEvents.unshift(socialMediaEvent);
  }

  getPronouns(): string {
    if(this.profileService.activeProfile()?.pronounVisibility == "SHOW_ALL" ||
      this.profileService.activeProfile()?.pronounVisibility == "SHOW_ON_PAGE"
    ) return " " + this.profileService.activeProfile()?.pronouns;
    return "";
  }

  getProfileImageLink(): string {
    if(!this.profileService.activeProfile()?.id) return "non-profile.png";
    return `${environment.sm_profile_url}Profile/pic/${this.profileService.activeProfile()?.id}`;
  }

  handlePrepReply(reply: FullPosting) {
    if(!this.profileService.activeProfile) return;
    this.parent = reply;

    this.edit = {
      text: "",
      contentId: undefined,
      profileId: this.profileService.activeProfile()?.id,
      moduleId: reply.posting.moduleId
    };
  }

  imageFallback($event: ErrorEvent) {
    let target = $event.target as HTMLImageElement;
    target.src = "non-profile.png";
  }

  prepareNewPosting(){
    
    this.parent = undefined;
    this.edit = new ContentEdit();
  }
}
