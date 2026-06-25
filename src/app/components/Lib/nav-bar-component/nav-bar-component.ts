import { Component, ElementRef, EventEmitter, HostListener, Input, Output, ViewChild } from '@angular/core';
import { NavProfilePipe, ProfileItem } from '../../../pipes/nav-profile-pipe-pipe';
import { CommonModule } from '@angular/common';
import { ElementContainerDirective } from '../../../directives/element-container-directive';
import { ElementItemDirective } from '../../../directives/element-item-directive';
import { NavOption, NavOptionShow, NavPipe } from '../../../pipes/nav-pipe';
import { AuthService } from '../../../services/auth-service';
import { StylesService } from '../../../services/styles-service';

export interface ProfileItemGroup {
  itemList: ProfileItem[];
}


export interface NavClickDetails {
  title: string;
  navLink?: string;
}

@Component({
  selector: 'app-nav-bar-component',
  imports: [CommonModule, NavPipe,
    NavProfilePipe,
    ElementContainerDirective,
    ElementItemDirective],
  templateUrl: './nav-bar-component.html',
  styleUrl: './nav-bar-component.css',
})
export class NavBarComponent {
    BASIC_DESKTOP = NavOptionShow.BASIC_DESKTOP;            // On Desktop, show on the left side of the top bar
  OPTION_DESKTOP = NavOptionShow.OPTION_DESKTOP;          // On Desktop, show towards the right
  BASIC_DESK_NO_MOB = NavOptionShow.BASIC_DESK_NO_MOB;    // Like "BASIC_DESKTOP", but don't show in mobile mode
  OPTION_DESK_NO_MOB = NavOptionShow.OPTION_DESK_NO_MOB;  // Like "OPTION_DESKTOP", but don't show in mobile mode
  ONLY_MOBILE = NavOptionShow.ONLY_MOBILE;                // Only show in mobile mode

  @Input()
  navOptions: NavOption[] = [];

  @Input()
  logoSrc: string | undefined;

  @Input()
  logoFirst: boolean = false; // If a logo is provided, put it to the left side of the top bar

  @Input()
  iconClass: string = "";     // Allows for external styling with the icons

  @Input()
  appStyleClass: string = "";

  @Input()
  basicImageUrl: string = "";

  @Input()
  blankProfileImg: string = "";

  @Input()
  divLineClass: string = "hide-div";

  @Input()
  zIndex: number = 35;

  @Input()
  items: ProfileItemGroup[] = [];

  @Input()
  baseUserUrl: string = "https://test.trecapps.com/";

  @Output()
  onNav = new EventEmitter<NavClickDetails>();

  @Output()
  onProfile = new EventEmitter<null>();

  @Output()
  onLoginRequestEmitter = new EventEmitter<null>();

  @Output()
  onProfileItemClicked = new EventEmitter<string>();

  @ViewChild("profilePanel")
  profilePanel!: ElementRef<HTMLDivElement>;

  
  @ViewChild("brandPanel")
  brandPanel!: ElementRef<HTMLDivElement>;

  styleService: StylesService;
  authService: AuthService;

  constructor(ss: StylesService, as: AuthService){
    this.styleService = ss;
    this.authService = as;
  }
  ngAfterViewInit(): void {
    //this.brandPanel.nativeElement.style.display = 'none';
    //this.brandPanel.nativeElement.hidden = true;
  }

  // isLoggedInBrand(brandId: string | undefined): boolean {
  //   if(!this.authService.tcBrand) return !brandId;
  //   return this.authService.tcBrand.id == brandId;
  // }

  imageError(event: Event){
    const target = event.target as HTMLImageElement;
    target.src = '/assets/Unknown_Profile.png'
  }

  // loggingInAsBrand: boolean = false;
  // loginAsBrand(brandId: string | undefined){
  //   if(this.loggingInAsBrand || this.isLoggedInBrand(brandId)) return;

  //   this.loggingInAsBrand = true;
  //   this.authService.loginBrand(brandId).subscribe({
  //     next: () => {
  //       this.loggingInAsBrand = false;
  //     },
  //     error: () => {
  //       this.loggingInAsBrand = false;
  //     }
  //   })
  // }

  onIconHover(option: NavOption, hovering: boolean){
    option.isHovering = hovering;
  }

  formatBrandId(id: string): string {
    if(id.startsWith('Brand-')) return id;
    return `Brand-${id}`;
  }

  onIconClick(option: NavOption){
    for(let curOption of this.navOptions){
      curOption.isFocusing = false;
    }
    option.isFocusing = true;

    this.onNav.emit({
      title: option.title,
      navLink: option.navLink
    });
  }

  getImage(option: NavOption): string | undefined {
    if(option.isFocusing){
      return option.focusImg || option.baseImg;
    }
    if(option.isHovering) {
      return option.hoverImg || option.baseImg;
    }
    return option.baseImg;
  }

  onLoginRequest(){
    this.onLoginRequestEmitter.emit();
  }

  onFocusProfile(event: MouseEvent){

    event.stopPropagation();
    event.preventDefault();
    if(this.profilePanel){
      this.profilePanel.nativeElement.hidden = false;
      this.profilePanel.nativeElement.style.opacity = "1";
      //this.profilePanel.nativeElement.style.display = "block";
    }
       
  }

  onFocusBrands(){
    //setTimeout(() => {
      //this.brandPanel.nativeElement.style.display = "block";
      this.brandPanel.nativeElement.hidden = false;
      this.brandPanel.nativeElement.style.opacity = "1";
    //}, 100);
    
  }

  @HostListener("mouseup")
  onMouseUp(){
    if(this.brandPanel?.nativeElement.style.opacity == "1"){
      this.brandPanel.nativeElement.style.opacity = "0";
      setTimeout(() => this.brandPanel.nativeElement.hidden = true, 333);
    }

    if(this.profilePanel?.nativeElement.style.opacity == "1"){
      this.profilePanel.nativeElement.style.opacity = "0";
      setTimeout(() => this.profilePanel.nativeElement.hidden = true, 333);
    }
  }
}
