import { DatePipe } from '@angular/common';
import { AfterViewInit, Component, EventEmitter, Input, Output } from '@angular/core';
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

    @Input()
  content: FullPosting = {
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
  }

  page: number = 0;
  size: number = 5;



  @Input()
  parent: Posting | undefined;


  @Input()
  showFull: boolean = true;

  @Output()
  onPrepReply: EventEmitter<FullPosting> = new EventEmitter<FullPosting>();


  hasMore: boolean = true;

  activeReaction: string = "";

  defaultImgSrc: string = 'non-profile.png';
  imageSrc: string = this.defaultImgSrc;

  constructor(
    private contentService: ContentService,
    private profileService: ProfileService,
    private reactionService: ReactionService){

  }

  reactions: RObjectMap = {}

  getContentPoster(): string {
    return this.content.posting.posterId || this.content.posting.ownerId || '';
  }

  ngAfterViewInit(): void {

    this.imageSrc = `${environment.image_service_url}Images/profile/${this.getContentPoster()}?app=${environment.app_name}`;

    this.reactionService.getReaction(this.content.posting.id).subscribe({
      next: (obj: ResponseObj) => {
        this.processReactionStats(obj);
      }
    })
  }

  onEdit(){
    this.contentService.edit = {
      text: this.content.posting.contents.at(-1)?.content || "",
      moduleId: this.content.posting.moduleId,
      contentId: this.content.posting.id,
      profileId: this.content.posting.ownerId
    }
    this.contentService.parent = this.parent;

  }

  retrievingReplies: boolean = false;
  getReplies() {
    if(this.retrievingReplies) return;
    this.retrievingReplies = true;
    this.contentService.getReplies(this.content.posting.id, this.page, this.size).subscribe({
      next:(replies: Posting[]) => {
        this.retrievingReplies = false;

        replies.forEach((reply: Posting) => {
          this.profileService.addFullPostingToList(this.content.replies, reply);
        })
      }, error: () => this.retrievingReplies = false
    })
  }

  processReactionStats(obj: ResponseObj){
    if(obj.status >= 300 || !obj.reactStats) return;

    let reactStats = obj.reactStats;
    this.activeReaction = reactStats.yourReaction || '';
    this.reactions = reactStats.reactions;
  }

  reactionOnSelect(event: ReactionEvent){
    this.reactionService.postReaction(event.type, this.content.posting.id).subscribe({
      next: (obj: ResponseObj) => {
        this.activeReaction = event.type;
        this.processReactionStats(obj);
      }
    })
  }

  getReactionInt(reaction: string): number {
    
    return Number.parseInt(this.reactions[reaction]?.toString()) || 0;
  }
}
