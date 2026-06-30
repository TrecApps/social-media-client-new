import { Component, ViewChild } from '@angular/core';
import { ResponseObj } from '../../../models/standard';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute, NavigationEnd } from '@angular/router';
import { Subscription, delay } from 'rxjs';
import { environment } from '../../../environment/environment';
import { Profile } from '../../../models/Profile';
import { ConnectionEntry, ProfileConnection, ConnectionService } from '../../../services/conection-service';
import { ProfileService } from '../../../services/profile-service';
import { ImagePanelComponent, ImageSelectionPurpose } from '../../Lib/image-panel-component/image-panel-component';
import { TopBarComponent } from '../../singulars/top-bar-component/top-bar-component';
import { ProfileDetailsComponent } from '../../singulars/profile-details-component/profile-details-component';

enum image_mode {
  PROFILE_PIC,
  COVER_PHOTO
}

@Component({
  selector: 'app-profile-component',
  imports: [    CommonModule,
    TopBarComponent, ImagePanelComponent,
    ProfileDetailsComponent],
  templateUrl: './profile-component.html',
  styleUrl: './profile-component.css',
})
export class ProfileComponent {

  imageMode: image_mode = image_mode.PROFILE_PIC;

  profileService: ProfileService;

  connectionEntry: ConnectionEntry | undefined;
  
  connectionEntry2: ConnectionEntry | undefined;

  minHeight: string = "200px";
  maxHeight: string = "400px";
  app: string = environment.app_name;
  imageUrl: string = environment.image_service_url;

  routeSubscription: Subscription;

  retrievalStatus: number = 200;
  connectionEntryError: boolean = false;
  retrievingProfile: boolean = false;

  showGallery: boolean = false;

  connectionStatus: string = "";

  galleryPurpose: ImageSelectionPurpose = ImageSelectionPurpose.SELECT;


  @ViewChild("profImgGallery")
  imgGallery!: ImagePanelComponent;

  @ViewChild("profileDetails")
  profileDetails!: ProfileDetailsComponent;

  onContentPrepped() {
    // this.galleryPurpose = ImageSelectionPurpose.SELECT;
  }


  private refreshConnection(id: string){
    this.connectionService.retrieveSingleConnection(id).subscribe({
      next: (entry: ProfileConnection) => {
        this.connectionEntry = entry.asFollowee || entry.asFollower;
        if(!entry.asFollowee && this.connectionEntry && this.connectionEntry.oneWay){
          // We are dealing with one way connection and we are not following this person
          this.connectionEntry = undefined;
        }
        this.connectionEntry2 = entry.asFollower; 
        this.retrievingProfile = false;
        this.connectionStatus = this.getConnectionStatus();
      },
      error: (er: any) => {
        this.connectionEntryError = Number.isInteger(er.status) && er.status >= 500;
        this.retrievingProfile = false;
        this.connectionStatus = this.getConnectionStatus();
      }
    })
  }

  attemptPostRetrival(){
    setTimeout(() => {
      this.profileDetails.retrievePosts(true);
    }, 200);
  }

  constructor(
    ps: ProfileService, 
    private connectionService: ConnectionService,
    private router: Router,
    private route: ActivatedRoute,
    //private messageService: MessageService
  ){
    this.profileService = ps;

    this.routeSubscription = this.router.events.subscribe((event) => {
      if(!(event instanceof NavigationEnd)) return;

      let navEnd = event as NavigationEnd;

      if(!navEnd.url.startsWith("/profile")) return;

      if(!this.profileService.authService.account)
      {
        router.navigateByUrl("/logon")
        return;
      }
      this.retrievalStatus = 200;
      this.connectionEntryError = false;
      this.retrievingProfile = true;

      let id: string| null = null;
      if(this.route.snapshot.queryParamMap.has("id")){
        id = this.route.snapshot.queryParamMap.get("id");
      }

      if(!id || id == this.profileService.activeProfile()?.id){
        // Assume own profile
        this.profileService.searchedProfile.set(undefined);
        this.connectionEntry = undefined;
        this.retrievingProfile = false;
        this.connectionStatus = this.getConnectionStatus();
        this.attemptPostRetrival();//profileDetails.retrievePosts(true);
      } else {

        this.profileService.retrieveProfile(id)
          .pipe(delay(500))
          .subscribe({
            next: (value: Profile) => {
              this.refreshConnection(value.id);
              this.attemptPostRetrival();//profileDetails.retrievePosts(true);
            },
            error: (er: any) => {
              
              this.retrievingProfile = false;
              if(Number.isInteger(er.status)) {
                this.retrievalStatus = er.status;
              } else this.retrievalStatus = 500;
              this.connectionStatus = this.getConnectionStatus();
            }
          })
      }
    });
  }

  getProfileImageUrl(useCover: boolean): string {
    let profile = this.profileService.presentProfile();
    if(!profile) return useCover ? "non-cover.png" : "non-profile.png";

    let app = `${environment.app_name}`
    
    if(useCover){
      app = `cover-${app}&fallback-false`;
    }

    return `${environment.image_service_url}/Images/profile/${profile.id}?app=${app}` 
  }

  imageFallback($event: ErrorEvent,useCover: boolean) {
    if($event?.target)
    {
      let target = $event.target as HTMLImageElement;
      target.src = useCover ? "non-cover.png" : "non-profile.png";

    }
  }

  getProfileDisplayName(): string {
    let profile = this.profileService.presentProfile();
    return profile?.title || "";
  }

  getConnectionStatus() : string {
    let searchedProfile = this.profileService.searchedProfile();
    let activeProfile = this.profileService.activeProfile();

    if(!activeProfile) return "ERROR";
    if(this.retrievingProfile) return "LOADING";

    if(!searchedProfile && !this.connectionEntry) return "SELF_PROFILE";

    if(this.connectionEntry?.oneWay && this.connectionEntry.id.follower == activeProfile.id) {
      return "FOLLOWING";
    }

    if(searchedProfile?.id.startsWith("Brand-") || activeProfile?.id.startsWith("Brand-"))
      return "CAN_FOLLOW";

    if(!this.connectionEntry) {
      return "CAN_CONNECT";
    }

    if(this.connectionEntry.accepted){
      return "CONNECTED";
    } else {
      if(this.connectionEntry.id.follower == activeProfile.id) return "AWAITING";
      return "CAN_ACCEPT";
    }
  }

  prepNewCoverPhoto(){
    this.imgGallery.onOpen();
    this.galleryPurpose = ImageSelectionPurpose.COVER;
    this.showGallery = true;
  }

  updatingConnection: boolean = false;

  respondToConnection(accept: boolean) {
    let searchedProfile = this.profileService.searchedProfile();
    let activeProfile = this.profileService.activeProfile();
    if(!this.connectionEntry || !searchedProfile?.id) return;
    
    this.updatingConnection = true;
    this.connectionService.editConnection(
      accept ? "approve" : "unfollow", 
      searchedProfile.id
    ).subscribe({
      next: (value: ResponseObj) => {
        if(accept && this.connectionEntry) {
          this.connectionEntry.accepted = new Date();
        } else this.connectionEntry = undefined;
        this.updatingConnection = false;
        this.connectionStatus = this.getConnectionStatus();
      }, 
      error: () => {
        this.updatingConnection = false;
      }
    });
  }

  requestConnection(){
    let searchedProfile = this.profileService.searchedProfile();
    let activeProfile = this.profileService.activeProfile();
    if(!searchedProfile?.id || !activeProfile?.id) return;

    let oneWay = searchedProfile.profileType === "BRAND" || activeProfile.profileType === "BRAND";

    this.connectionService.editConnection("follow", searchedProfile?.id || "")
      .subscribe({
        next: (val: ResponseObj) => {
          this.connectionEntry = {
            id: {
              follower: activeProfile?.id || "",
              followee: searchedProfile?.id || ""
            },
            oneWay,
            made: new Date(),
            accepted: undefined
          }
          this.connectionStatus = this.getConnectionStatus();
        }
      })

  }

  // message() {
  //   let searchedProfile = this.profileService.searchedProfile();
  //   if(searchedProfile)
  //     this.messageService.setToConveration(searchedProfile.id);
  // }

  prepNewProfilePhoto() {
    
    this.imgGallery.onOpen();
    this.galleryPurpose = ImageSelectionPurpose.PROFILE;
    this.showGallery = true;
  }

  removeConnection() {
    let searchedProfile = this.profileService.searchedProfile();
    if(!searchedProfile?.id) return;

    this.connectionService.editConnection("unfollow", searchedProfile.id).subscribe({
      next: (vl: ResponseObj) => {
        this.connectionEntry = undefined;
      }
    })
  }

  prepBlock() {
    
  }

}


