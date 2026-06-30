import { Component, ElementRef, EventEmitter, input, Input, InputSignal, OnInit, Output, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
//import { AuthService, ElementContainerDirective, ElementItemDirective, ImageEntry, ImageGalleryV2Component, ImageSelectionPurpose, PopupComponent } from '@tc/tc-ngx-general';
import { ContentPost, ContentPut, FullPosting, Posting } from '../../../models/Content';
import { ContentEdit, ContentService } from '../../../services/content-service';
import { ContentComponent } from '../../repeats/content-component/content-component';
import { environment } from '../../../environment/environment';
import { Observable } from 'rxjs';
import { ResponseObj } from '../../../models/ResponseObj';
import { ElementContainerDirective } from '../../../directives/element-container-directive';
import { ElementItemDirective } from '../../../directives/element-item-directive';
import { ImageEntry } from '../../../models/images';
import { AuthService } from '../../../services/auth-service';
import { ImagePanelComponent, ImageSelectionPurpose } from '../../Lib/image-panel-component/image-panel-component';
import { PopupComponent } from '../../Lib/popup-component/popup-component';

@Component({
  selector: 'app-content-editor-component',
  imports: [
    FormsModule,
    PopupComponent, ContentComponent, ImagePanelComponent,
    ElementContainerDirective, ElementItemDirective],
  templateUrl: './content-editor-component.html',
  styleUrl: './content-editor-component.css'
})
export class ContentEditorComponent implements OnInit {

  @Input(  )
  parent: FullPosting | undefined;

  
  edit: InputSignal<undefined | ContentEdit> = input();

  @Output()
  onPopupClose = new EventEmitter<void>();

  @Output()
  imageActivator = new EventEmitter();

  @Output()
  onPosted = new EventEmitter<Posting>();

  @ViewChild('myArea')
  theEditor!: ElementRef<HTMLTextAreaElement>;

  galleryPurpose: ImageSelectionPurpose = ImageSelectionPurpose.SELECT;

  isBold: boolean = false;
  isItalic: boolean = false;

  showGallery: boolean = false;

  // Base Details
  baseUrl: string = environment.image_service_url;

  useZIndex: number = 50;

  showError: boolean = false;

  onTextEdit(event: Event){
    let edit = this.edit();
    if(!edit) return;

    edit.text = (event.target as HTMLTextAreaElement).value;
  }

  constructor(private contentService: ContentService, private authService: AuthService) {

  }
  ngOnInit(): void {
    this.useZIndex = Number.parseInt(this.theEditor.nativeElement.style.zIndex || "40") + 10;
    this.showError = false;
  }


  post(){
    let edit = this.edit();
    if(!edit) return;
    
    this.showError = false;
    let observe: Observable<ResponseObj>;
    if(edit?.contentId){
      let contentPut: ContentPut = {
        content: edit.text,
        contentId: edit.contentId
      }
      observe = this.contentService.editContent( contentPut );
    } else {
      let contentPost: ContentPost = {
        content: edit.text,
        moduleId: edit.moduleId,
        parentId: this.parent?.posting.id,
        profileId: edit.profileId|| ""
      };
      observe = this.contentService.postContent( contentPost );
    }

    observe.subscribe({
      next: (obj: ResponseObj) => {
        if(obj.status >= 200 && obj.status < 300){
          let posting = obj.data as Posting;
          this.onPosted.emit(posting);
        } else {
          this.showError = true;
        }
      },
      error: () => {
        this.showError = true;
      }
    })
  }

  addImage(iInsert: ImageEntry){
    let textElement = this.retrieveElement();
    if(!textElement){
      return;
    }

    let edit = this.edit();
    if(!edit) return;

    let content = edit.text;
    let textInsert = `\n:Image:${iInsert.record.id}\n`;

    let preText = content.substring(0, textElement.selectionStart);
    let postText = content.substring(textElement.selectionEnd);
  
    content = `${preText}${textInsert}${postText}`;

    edit.text = content;

    this.changeSelection(textElement, textInsert.length);

    this.showGallery = false;
  }


  // Edit Methods
  retrieveElement(): HTMLTextAreaElement | undefined {
    if(this.theEditor){
      return this.theEditor.nativeElement;
    }
    return undefined;
  }

  toggleCodeStat(marker: string, isActive: boolean, textElement: HTMLTextAreaElement) {
    let edit = this.edit();
    if(!edit) return;

    let markerLength = marker.length;

    let content = edit.text;

    if(!isActive){
      let preText = content.substring(0, textElement.selectionStart);
      let selectedText = content.substring(textElement.selectionStart, textElement.selectionEnd);
      let postText = content.substring(textElement.selectionEnd);
      edit.text = `${preText}${marker}${selectedText}${marker}${postText}`;

      this.changeSelection(textElement, markerLength)

    } else {
      let prevMarker = content.lastIndexOf(marker, textElement.selectionStart);
      let nextMarker = content.indexOf(marker, textElement.selectionEnd);

      if(prevMarker != -1 && nextMarker != -1) {
        let preText = content.substring(0, prevMarker);
        let middleText = content.substring(prevMarker + markerLength, nextMarker);
        let postText = content.substring(nextMarker + markerLength);

        edit.text = `${preText}${middleText}${postText}`;
        this.changeSelection(textElement, -markerLength)
      }
    }
  }

  changeSelection(textElement: HTMLTextAreaElement, change: number, collapsingText: boolean = false){
    let currentSelectionStart = textElement.selectionStart + change;

    let currentSelectionEnd = collapsingText ? currentSelectionStart : textElement.selectionEnd + change;

    
    textElement.focus();
    setTimeout(() => textElement.setSelectionRange(currentSelectionStart, currentSelectionEnd, "forward"));
  }

  findListOfMarks(marker: string): number[] {
    let ret: number[] = [];
    let edit = this.edit();
    if(!edit) return ret;

    for(let start = 0, append = edit.text.indexOf(marker, start); append != -1; append = edit.text.indexOf(marker, start)){
      ret.push(append);
      start += append + marker.length;
    }

    return ret;
  }

  callibrateState(){
    let textElement = this.retrieveElement();
    if(!textElement){
      return;
    }

    let b = this.findListOfMarks('**');
    let i = this.findListOfMarks('__');

    
    this.isBold = false;
    for(let index = 0; index < b.length - 1; index += 2){
      let lower = b[index];
      let upper = b[index + 1];

      if((textElement.selectionStart > lower + 1) && (textElement.selectionEnd <= upper)){
        this.isBold = true;
        break;
      }
    }

    this.isItalic = false;
    for(let index = 0; index < i.length - 1; index += 2){
      let lower = i[index];
      let upper = i[index + 1];

      if((textElement.selectionStart > lower) && (textElement.selectionEnd < upper)){
        this.isItalic = true;
        break;
      }
    }
  }

  onClickBold(){
    let textElement = this.retrieveElement();
    if(!textElement){
      return;
    }

    textElement.focus();
    this.toggleCodeStat('**', this.isBold, textElement);

    this.isBold = !this.isBold;
  }

  onClickItalic(){
    let textElement = this.retrieveElement();
    if(!textElement){
      return;
    }


    textElement.focus();
    this.toggleCodeStat('__', this.isItalic, textElement);

    this.isItalic = !this.isItalic;
  }

  onToggleGallery()
  {
    this.showGallery = !this.showGallery;
  }

  onClickPicture(){
    this.showGallery = true;
  }

}
