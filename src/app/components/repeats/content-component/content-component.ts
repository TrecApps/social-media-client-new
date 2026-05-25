import { DatePipe } from '@angular/common';
import { AfterViewInit, Component, EventEmitter, Input, model, ModelSignal, Output, signal, WritableSignal } from '@angular/core';
import { HtmlRemoverPipe } from '../../../pipes/html-remover.pipe';
import { TcFormatterPipe } from '../../../pipes/tc-formatter.pipe';
import { ContentService } from '../../../services/content-service';
import { ReactionButtonComponent, ReactionEvent } from '../reaction-button-component/reaction-button-component';
import { ReactionService } from '../../../services/reaction-service';
import { environment } from '../../../environment/environment';
import { ProfileService } from "../../../services/profile-service"
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ElementContainerDirective } from '../../../directives/element-container-directive';
import { ElementItemDirective } from '../../../directives/element-item-directive';
import { ResponseObj, RObjectMap } from '../../../models/standard';
import { FullPosting, Posting } from '../../../models/Content';

@Component({
  selector: 'app-content-component',
  imports: [
    ElementContainerDirective, ElementItemDirective,
    HtmlRemoverPipe, TcFormatterPipe, DatePipe,
    ReactionButtonComponent, MatProgressSpinnerModule
  ],
  templateUrl: './content-component.html',
  styleUrl: './content-component.css'
})
export class ContentComponent implements AfterViewInit{


  content: ModelSignal<FullPosting> = model({
    posting: {
      id: '1',
      parents: [],

      moduleId: undefined,
      made: new Date(),
      deleteSet: undefined,
      contents: [{
        content: 'Hello Operator',
        made: new Date(),
        version: ''
      }],
      parent: undefined,
      posterId: '',
      userAccountId: '',
      ownerId: undefined
    },
    posterDetails: {
      id: '',
      displayName: 'Trooper',
      shortAboutMe: "Orange Cat",
      pronouns: undefined
    },
    moduleName: undefined,
    ownerName: undefined,
    replies: []
  } as FullPosting);

  page: WritableSignal<number> = signal(0);
  size: WritableSignal<number> = signal(5);



  @Input()
  parent: Posting | undefined;


  @Input()
  showFull: boolean = true;

  @Output()
  onPrepReply: EventEmitter<FullPosting> = new EventEmitter<FullPosting>();


  hasMore: WritableSignal<boolean> = signal(true);

  activeReaction: WritableSignal<string> = signal("");

  defaultImgSrc: string = 'non-profile.png';
  imageSrc: WritableSignal<string> = signal(this.defaultImgSrc);

  constructor(
    private contentService: ContentService,
    private profileService: ProfileService,
    private reactionService: ReactionService){

  }

  reactions: RObjectMap = {}

  getContentPoster(): string {
    return this.content().posting.posterId || this.content().posting.ownerId || '';
  }

  ngAfterViewInit(): void {

    this.imageSrc.set(`${environment.image_service_url}Images/profile/${this.getContentPoster()}?app=${environment.app_name}`);

    this.reactionService.getReaction(this.content().posting.id).subscribe({
      next: (obj: ResponseObj) => {
        this.processReactionStats(obj);
      }
    })
  }

  onEdit(){
    this.contentService.edit = {
      text: this.content().posting.contents.at(-1)?.content || "",
      moduleId: this.content().posting.moduleId,
      contentId: this.content().posting.id,
      profileId: this.content().posting.ownerId
    }
    this.contentService.parent = this.parent;

  }

  retrievingReplies: WritableSignal<boolean> = signal(false);
  getReplies() {
    if(this.retrievingReplies()) return;
    this.retrievingReplies.set(true);
    this.contentService.getReplies(this.content().posting.id, this.page(), this.size()).subscribe({
      next:(replies: Posting[]) => {
        this.retrievingReplies.set(false);

        replies.forEach((reply: Posting) => {
          this.profileService.addFullPostingToList(this.content().replies, reply);
        })
      }, error: () => this.retrievingReplies.set(false)
    })
  }

  processReactionStats(obj: ResponseObj){
    if(obj.status >= 300 || !obj.reactStats) return;

    let reactStats = obj.reactStats;
    this.activeReaction.set(reactStats.yourReaction || '');
    this.reactions = reactStats.reactions;
  }

  reactionOnSelect(event: ReactionEvent){
    this.reactionService.postReaction(event.type, this.content().posting.id).subscribe({
      next: (obj: ResponseObj) => {
        this.activeReaction.set(event.type);
        this.processReactionStats(obj);
      }
    })
  }

  getReactionInt(reaction: string): number {
    
    return Number.parseInt(this.reactions[reaction]?.toString()) || 0;
  }
}
