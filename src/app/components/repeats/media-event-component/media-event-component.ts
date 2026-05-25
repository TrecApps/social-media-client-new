import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { SocialMediaEvent } from '../../../models/MediaEvent';
import { FullPosting, Posting } from '../../../models/Content';
import { ContentService } from '../../../services/content-service';
import { BasicProfile } from '../../../models/Profile';
import { ProfileService } from '../../../services/profile-service';
import { ContentComponent } from '../content-component/content-component';
import { MatProgressSpinner } from "@angular/material/progress-spinner";
import { ElementContainerDirective } from '../../../directives/element-container-directive';
import { ElementItemDirective } from '../../../directives/element-item-directive';

@Component({
  selector: 'app-media-event-component',
  imports: [ElementContainerDirective, ElementItemDirective,
    ContentComponent, MatProgressSpinner],
  templateUrl: './media-event-component.html',
  styleUrl: './media-event-component.css'
})
export class MediaEventComponent implements OnInit {

  @Input()
  mediaEvent!: SocialMediaEvent;

  @Output()
  onPrepReply: EventEmitter<FullPosting> = new EventEmitter<FullPosting>();

  content: FullPosting | undefined;

  parentContent: FullPosting | undefined;

  otherProfile: BasicProfile | undefined;

  constructor(private contentService: ContentService, private profileService: ProfileService){

  }
  ngOnInit(): void {
    this.contentService.getPosting(this.mediaEvent.contentId).subscribe({
      next: (value: Posting) => {
        
        this.profileService.updateDisplayName(value.posterId, (val: BasicProfile) => {
          this.content = {
            posting: value,
            posterDetails: val,
            replies: [],

            // ToDo: handle
            ownerName: undefined,
            moduleName: undefined
          }
        })
      }
    });

    if(this.mediaEvent.parentContentId){
      this.contentService.getPosting(this.mediaEvent.parentContentId).subscribe({
      next: (value: Posting) => {
        this.profileService.updateDisplayName(value.posterId, (val: BasicProfile) => {
          this.parentContent = {
            posting: value,
            posterDetails: val,
            replies: [],

            // ToDo: handle
            ownerName: undefined,
            moduleName: undefined
          }
        })
      }
    });
    }

    if(this.mediaEvent.otherProfile){
      this.profileService.updateDisplayName(this.mediaEvent.otherProfile, (val: BasicProfile) => {
        this.otherProfile = val;
      })
    }

  }

  prepReply(fp: FullPosting){
    this.onPrepReply.emit(fp);
  }

}
