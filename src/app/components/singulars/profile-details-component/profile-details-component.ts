import { Component, EventEmitter, input, Input, InputSignal, model, ModelSignal, Output, signal, WritableSignal } from '@angular/core';
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


class ShowWorkPerspective{
  workPerspective: WorkExpHolder = new WorkExpHolder();
  show: boolean = false;
}

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
    
  connectionStatus: InputSignal<string> = input('');

  @Output()
  onNewContentPrepped: EventEmitter<void> = new EventEmitter<void>();

  profileService: ProfileService;

  showEducation: WritableSignal<Education | undefined> = signal(undefined);
  showWorkPerspective: ModelSignal<ShowWorkPerspective> = model<ShowWorkPerspective>(new ShowWorkPerspective());
  eduIndex: WritableSignal<number> = signal(-1);

  setNewWorkPerspective(holder: WorkExpHolder | undefined){
    let workPerspective = new ShowWorkPerspective();
    if(holder){
      workPerspective.workPerspective = holder;
      workPerspective.show = true;
    }
    this.showWorkPerspective.set(workPerspective);
  }

  // Making a Post
  edit: ModelSignal<ContentEdit | undefined> = model<ContentEdit|undefined>(undefined);
  parent: WritableSignal<FullPosting | undefined> = signal(undefined);

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
  
  curTab: WritableSignal<string> = signal("fav");


  private generateBlankPostingList(): SortedList<FullPosting> {
  
    return new SortedList<FullPosting>((a: FullPosting, b: FullPosting) => {
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
  });}

  postingList: WritableSignal<SortedList<FullPosting>> = signal(this.generateBlankPostingList());

  outOfPosts: WritableSignal<boolean> = signal(false);
  postingPage: WritableSignal<number> = signal(0);
  postingSize: WritableSignal<number> = signal(15);


  constructor(ps: ProfileService, private contentService: ContentService){
    this.profileService = ps;
  }

  getProfileDisplayName(): string {
    let profile = this.profileService.presentProfile();
    return profile?.title || "";
  }


  updatingEducation: WritableSignal<boolean> = signal(false);
  prepNewEducation(){
    this.eduIndex.set(-1);
    this.showEducation.set(new Education());
  }

  updateEducation(update: boolean = true){
    if(!this.showEducation() || this.updatingEducation()) return;
    this.updatingEducation.set(true);
    let passIndex = this.eduIndex() == -1 ? undefined : this.eduIndex().toString();
    let callType: CALL_TYPE = update ? (
      passIndex ? CALL_TYPE.PUT : CALL_TYPE.POST
    ) : CALL_TYPE.DELETE;
    let curIndex = this.eduIndex();
    this.profileService.editEnducation(callType, this.showEducation(), passIndex)
      .subscribe({
        next: (response: ResponseObj) => {
          let activeProfile = this.profileService.activeProfile();
          let showEducation = this.showEducation();
          if(callType == CALL_TYPE.POST) {
            if(showEducation && activeProfile)
              activeProfile.education.push(showEducation);
          } else if(callType == CALL_TYPE.PUT) {
            if(showEducation && activeProfile)
              activeProfile.education[curIndex] = showEducation;
          } else if(callType == CALL_TYPE.DELETE) {
            if(showEducation && activeProfile) {
              activeProfile.education.splice(curIndex, 1);
            }
            this.showEducation.set(undefined);
          }
        
          this.updatingEducation.set(false);
        },
        error: () => {
          this.updatingEducation.set(false);
        }
      })
  
  }

  workIsNew: WritableSignal<boolean> = signal(false);

  prepNewPerspective(){
    this.workIsNew.set(true);
    let showWorkPerspective = new ShowWorkPerspective();
    showWorkPerspective.show = true;
    this.showWorkPerspective.set(showWorkPerspective);
  }
  updatingWork: WritableSignal<boolean> = signal(false);
  updateWorkExperience(holder: WorkExpHolder | undefined, doDelete: boolean = false){
    if(this.updatingWork()) return;
    if(!holder) return;

    holder.perspective = holder.perspective.map((v: string) => {
      return v.trim();
    }).filter((v: string) => v.length);

    if(holder.perspective.length == 0){
      alert("Perspective Title needed to post!");
      return;
    }

    this.updatingWork.set(true);

    let callType: CALL_TYPE = !doDelete ? (
      this.workIsNew() ? CALL_TYPE.POST : CALL_TYPE.PUT
    ) : CALL_TYPE.DELETE;

    this.profileService.editExperience(callType, holder, holder.perspective[0]).subscribe({
      next: (val: ResponseObj) => {

        this.updatingWork.set(false);
        let targetProfile = this.profileService.activeProfile();
        if(!targetProfile) {
          this.showWorkPerspective.set(new ShowWorkPerspective());
          return;
        }
        if(doDelete){
          
          targetProfile.workExperiences = targetProfile.workExperiences.filter((tempHolder: WorkExpHolder) => {
            if(tempHolder.perspective.map((v: string) => v.trim()).includes(holder.perspective[0])) return false;
            return true;
          });
        } else {
          if(this.workIsNew()){
            this.workIsNew.set(false);
            targetProfile.workExperiences.push(holder);
          }
        }

        this.showWorkPerspective.set(new ShowWorkPerspective());
      },
      error: () => {
        this.updatingWork.set(false);
      }
    })
  }

  prepareNewPosting(posting: FullPosting | undefined){
    this.parent.set(posting);
    let edit = new ContentEdit();
    edit.profileId = this.profileService.presentProfile()?.id;
    this.edit.set(edit);
    this.onNewContentPrepped.emit();
  }

  handlePostResult(posting: Posting){
    let edit = this.edit();
    if(this.handlePostResultOnParent(posting) || !edit) return;

    if(edit.contentId){
      // Posting already exists, simply update

      let targetIndex = posting.contents.length - 1;
      let newContent = posting.contents.at(targetIndex);
      if(newContent){
        this.postingList().items.forEach((reply: FullPosting) => {
          if(reply.posting.id == edit?.contentId && targetIndex >= 0){      
            reply.posting.contents.push(newContent);  
          }
        })
      } else {
        this.profileService.addFullPostingToSortedList(this.postingList, posting);
      }
    } else {
      this.profileService.addFullPostingToSortedList(this.postingList, posting);
    }

    this.edit.set(undefined);
    this.parent.set(undefined);


  }

  handlePostResultOnParent(posting: Posting): boolean {
    let edit = this.edit();
    let parent = this.parent();
    if(!parent || !edit) return false;

    if(edit.contentId){
      // Posting already exists, simply update

      let targetIndex = posting.contents.length - 1;
      let newContent = posting.contents.at(targetIndex);
      if(newContent)
        parent.replies.forEach((reply: FullPosting) => {
          if(reply.posting.id == edit?.contentId && targetIndex >= 0){      
            reply.posting.contents.push(newContent);  
          }
        });
    } else {
      this.profileService.addFullPostingToList(parent.replies, posting);
    }

    return true;

  }

  retrievingPosts: boolean = false;
  retrievePosts(brandNew: boolean) {
    if(this.retrievingPosts) return;
    let prof = this.profileService.presentProfile();
    if(!prof) return;
    if(brandNew){
      this.postingList.set(this.generateBlankPostingList());
      this.postingPage.set(0);
      this.outOfPosts.set(false);
    }

    this.retrievingPosts = true;
    this.contentService.getPostListByProfile(prof.id, this.postingPage(), this.postingSize()).subscribe({
      next: (ids: string[]) => {
        this.retrievingPosts = false;
        this.postingPage.update((value: number) => value + 1);
        if(ids.length < this.postingSize()){
          this.outOfPosts.set(true);
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
