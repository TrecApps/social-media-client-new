import { CommonModule } from '@angular/common';
import { Component, HostListener, signal, WritableSignal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { environment } from '../../../environment/environment';
import { ProfileSearchResult } from '../../../models/Profile';
import { ProfileService } from '../../../services/profile-service';
import { StylesService } from '../../../services/styles-service';

@Component({
  selector: 'app-search-bar-component',
  imports: [FormsModule, CommonModule],
  templateUrl: './search-bar-component.html',
  styleUrl: './search-bar-component.css',
})
export class SearchBarComponent {
  query: WritableSignal<string> = signal("");

  profileResults: WritableSignal<ProfileSearchResult[]> = signal([]);

  backupResults: ProfileSearchResult[] = [];

  styleService: StylesService;

  imageBase: string;
  app: string;

  constructor(private profileService: ProfileService, private router: Router, ss: StylesService){
    this.styleService = ss;
    this.imageBase = environment.image_service_url;
    this.app = environment.app_name;
  }

  searchProfiles(){
    this.profileService.searchProfiles(this.query(), 0, 6).subscribe({
      next: (results: ProfileSearchResult[]) => this.profileResults.set(results)
    })
  }

  switchToProfile(result: ProfileSearchResult){
    this.router.navigate(["/profile"], {
      queryParams: {
        id: result.id
      }
    })
  }

  @HostListener("document:click")
  onLoseFocus(){
    this.backupResults = this.profileResults();
    this.profileResults.set([]);
  }

  onGainFocus(event: Event){
    event.preventDefault();
    event.stopPropagation();
    this.profileResults.set(this.backupResults);
  }
}
