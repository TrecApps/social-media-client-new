import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ElementItemDirective } from '../../../directives/element-item-directive';
import { BottomTickerComponent } from '../../Lib/bottom-ticker-component/bottom-ticker-component';
import { DuoContentComponent } from '../../Lib/duo-content-component/duo-content-component';
import { TabComponent, TabOption } from '../../Lib/tab-component/tab-component';
import { ConnectionListComponent } from '../../repeats/connection-list-component/connection-list-component';
import { ContentComponent } from '../../repeats/content-component/content-component';
import { ContentEditorComponent } from '../content-editor-component/content-editor-component';
import { FullPosting, Posting } from '../../../models/Content';
import { Education } from '../../../models/Education';
import { SortedList } from '../../../models/SortedList';
import { ResponseObj } from '../../../models/ResponseObj';

import { WorkExpHolder } from '../../../models/WorkExperience';
import { ContentEdit, ContentService } from '../../../services/content-service';
import { CALL_TYPE } from '../../../services/EndpointConstants';
import { ProfileService } from '../../../services/profile-service';
import { PopupComponent } from "../../Lib/popup-component/popup-component";
import { EditEducation } from '../edit-education/edit-education';
import { WorkPerspectiveComponent } from '../work-perspective-component/work-perspective-component';

@Component({
  selector: 'app-profile-details-component',
  imports: [DuoContentComponent, TabComponent, ContentEditorComponent,
    ContentComponent, BottomTickerComponent, ConnectionListComponent,
    EditEducation, WorkPerspectiveComponent,
    ElementItemDirective, PopupComponent],
  templateUrl: './profile-details-component.html',
  styleUrl: './profile-details-component.css',
})
export class ProfileDetailsComponent {
    @Input()
  connectionStatus: string = '';

  @Output()
  onNewContentPrepped: EventEmitter<void> = new EventEmitter<void>();

  profileService: ProfileService;

  showEducation: Education | undefined;
  showWorkPerspective: WorkExpHolder | undefined;
  eduIndex: number = -1;


  // Making a Post
  edit: ContentEdit | undefined;
  parent: FullPosting | undefined;

  tabOptions: TabOption[] = [
    {
      showTitle: "Favorites",
      actTitle: "fav"
    }, {
      showTitle: "Education",
      actTitle: "edu"
    }, {
      showTitle: "Work Experience",
      actTitle: "work"
    }, {
      showTitle: "Connections",
      actTitle: "conn"
    }
  ];
  
  curTab: string = "fav";


  postingList: SortedList<FullPosting> = new SortedList<FullPosting>((a: FullPosting, b: FullPosting) => {
    let bVal = 0;
    let aVal = 0;
    try{
      aVal = Number.parseFloat(a.posting.made.toString());
    } catch(e) {
      aVal = a.posting.made.getTime()
    }

    try{
      bVal = Number.parseFloat(b.posting.made.toString());
    } catch(e) {
      bVal = b.posting.made.getTime()
    }
    
    return bVal - aVal;
  });

  outOfPosts: boolean = false;
  postingPage: number = 0;
  postingSize: number = 15;


  constructor(ps: ProfileService, private contentService: ContentService){
    this.profileService = ps;
  }

  getProfileDisplayName(): string {
    let profile = this.profileService.presentProfile();
    return profile?.title || "";
  }


  updatingEducation: boolean = false;
  prepNewEducation(){
    this.eduIndex = -1;
    this.showEducation = new Education();
  }

  updateEducation(update: boolean = true){
    if(!this.showEducation || this.updatingEducation) return;
    this.updatingEducation = true;
    let passIndex = this.eduIndex == -1 ? undefined : this.eduIndex.toString();
    let callType: CALL_TYPE = update ? (
      passIndex ? CALL_TYPE.PUT : CALL_TYPE.POST
    ) : CALL_TYPE.DELETE;
    let curIndex = this.eduIndex;
    this.profileService.editEnducation(callType, this.showEducation, passIndex)
      .subscribe({
        next: (response: ResponseObj) => {
          let activeProfile = this.profileService.activeProfile();
          if(callType == CALL_TYPE.POST) {
            if(this.showEducation && activeProfile)
              activeProfile.education.push(this.showEducation);
          } else if(callType == CALL_TYPE.PUT) {
            if(this.showEducation && activeProfile)
              activeProfile.education[curIndex] = this.showEducation;
          } else if(callType == CALL_TYPE.DELETE) {
            if(this.showEducation && activeProfile) {
              activeProfile.education.splice(curIndex, 1);
            }
            this.showEducation = undefined;
          }
        
          this.updatingEducation = false;
        },
        error: () => {
          this.updatingEducation = false;
        }
      })
  
  }

  workIsNew: boolean = false;

  prepNewPerspective(){
    this.workIsNew = true;
    this.showWorkPerspective = new WorkExpHolder();
  }
  updatingWork: boolean = false;
  updateWorkExperience(holder: WorkExpHolder, doDelete: boolean = false){
    if(this.updatingWork) return;

    holder.perspective = holder.perspective.map((v: string) => {
      return v.trim();
    }).filter((v: string) => v.length);

    if(holder.perspective.length == 0){
      alert("Perspective Title needed to post!");
      return;
    }

    this.updatingWork = true;

    let callType: CALL_TYPE = !doDelete ? (
      this.workIsNew ? CALL_TYPE.POST : CALL_TYPE.PUT
    ) : CALL_TYPE.DELETE;

    this.profileService.editExperience(callType, holder, holder.perspective[0]).subscribe({
      next: (val: ResponseObj) => {

        this.updatingWork = false;
        let targetProfile = this.profileService.activeProfile();
        if(!targetProfile) {
          this.showWorkPerspective = undefined;
          return;
        }
        if(doDelete){
          
          targetProfile.workExperiences = targetProfile.workExperiences.filter((tempHolder: WorkExpHolder) => {
            if(tempHolder.perspective.map((v: string) => v.trim()).includes(holder.perspective[0])) return false;
            return true;
          });
        } else {
          if(this.workIsNew){
            this.workIsNew = false;
            targetProfile.workExperiences.push(holder);
          }
        }

        this.showWorkPerspective = undefined;
      },
      error: () => {
        this.updatingWork = false;
      }
    })
  }

  prepareNewPosting(posting: FullPosting | undefined){
    this.parent = posting;
    this.edit = new ContentEdit();
    this.edit.profileId = this.profileService.presentProfile()?.id;
    this.onNewContentPrepped.emit();
  }

  handlePostResult(posting: Posting){
    if(this.handlePostResultOnParent(posting) || !this.edit) return;

    if(this.edit.contentId){
      // Posting already exists, simply update

      let targetIndex = posting.contents.length - 1;
      let newContent = posting.contents.at(targetIndex);
      if(newContent){
        this.postingList.items.forEach((reply: FullPosting) => {
          if(reply.posting.id == this.edit?.contentId && targetIndex >= 0){      
            reply.posting.contents.push(newContent);  
          }
        })
      } else {
        this.profileService.addFullPostingToSortedList(this.postingList, posting);
      }
    } else {
      this.profileService.addFullPostingToSortedList(this.postingList, posting);
    }

    this.edit = undefined;
    this.parent = undefined;


  }

  handlePostResultOnParent(posting: Posting): boolean {
    if(!this.parent || !this.edit) return false;

    if(this.edit.contentId){
      // Posting already exists, simply update

      let targetIndex = posting.contents.length - 1;
      let newContent = posting.contents.at(targetIndex);
      if(newContent)
        this.parent.replies.forEach((reply: FullPosting) => {
          if(reply.posting.id == this.edit?.contentId && targetIndex >= 0){      
            reply.posting.contents.push(newContent);  
          }
        });
    } else {
      this.profileService.addFullPostingToList(this.parent.replies, posting);
    }

    return true;

  }

  retrievingPosts: boolean = false;
  retrievePosts(brandNew: boolean) {
    if(this.retrievingPosts) return;
    let prof = this.profileService.presentProfile();
    if(!prof) return;
    if(brandNew){
      this.postingList.clear();
      this.postingPage = 0;
      this.outOfPosts = false;
    }

    this.retrievingPosts = true;
    this.contentService.getPostListByProfile(prof.id, this.postingPage, this.postingSize).subscribe({
      next: (ids: string[]) => {
        this.retrievingPosts = false;
        this.postingPage++;
        if(ids.length < this.postingSize){
          this.outOfPosts = true;
        }
        for(let id of ids){
          this.contentService.getPosting(id).subscribe({
            next: (value: Posting) => {
              this.profileService.addFullPostingToSortedList(this.postingList, value);
            }
          })
        }
      }, 
      error: () => {
        this.retrievingPosts = false;
      }
    })
  }
}
