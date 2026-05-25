import { Component, ElementRef, EventEmitter, HostListener, input, Input, InputSignal, Output, signal, ViewChild, WritableSignal } from '@angular/core';
import { ImageUploadMode, ImageEntry, ImageVisibilityOption, ImageVisibility, ImageRecord, ImageState } from '../../../models/images';
import { SortedList } from '../../../models/SortedList';
import { ImageService } from '../../../services/image-service';
import { ResponseObj } from '../../../models/standard';
import { environment } from '../../../environment/environment';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ImageAlbumFilterPipe } from '../../../pipes/image-album-filter-pipe';
import { ImageVisibilityFilterPipe } from '../../../pipes/image-visibility-filter-pipe-pipe';
import { UpSliderComponent } from '../up-slider-component/up-slider-component';

interface ImageUploadModeOption {
  mode: ImageUploadMode;
  modeName: string;
  modeExplaination: string;
}

export enum ImageSelectionPurpose {
  BLANK,
  SELECT,
  PROFILE,
  COVER
}

const bytesInMB: number = 1000000;

@Component({
  selector: 'app-image-panel-component',
  imports: [
    CommonModule, FormsModule, ImageAlbumFilterPipe,
    UpSliderComponent, ImageVisibilityFilterPipe],
  templateUrl: './image-panel-component.html',
  styleUrl: './image-panel-component.css',
})
export class ImagePanelComponent {

  @ViewChild('outerSlider')
  slider: UpSliderComponent | undefined;

  permittedFileTypes = [
    "gif",
    "jpeg",
    "png",
    "svg",
    "webp"];
    

  app: InputSignal<string> = input<string>("main");   // The app being represented ('main' stands for all apps)

  
  retrieveAllImages: InputSignal<boolean> = input<boolean>(false);

  
  show: InputSignal<boolean> = input<boolean>(false);

  
  zIndex: InputSignal<number> = input<number>(10); // Default for UpSlider Component

 
  purpose: InputSignal<ImageSelectionPurpose> = input<ImageSelectionPurpose>(ImageSelectionPurpose.BLANK);   // If blank, there is no extra functionality. 


  mbLimit: InputSignal<number> = input<number>(0);  // Limit for image analysis


  maxHeight: InputSignal<string> = input<string>('100%');

  defaultPurpose: ImageSelectionPurpose = ImageSelectionPurpose.BLANK;
  

  @Output()
  onClose = new EventEmitter();

  @Output()
  onSelectImage = new EventEmitter<ImageEntry>();

  curAlbum: WritableSignal<string | undefined> = signal(undefined);

  get albums(): string[] {
    return this.currentImage()?.record?.album || [];
  }

  setAlbum(album: string | undefined){
    this.curAlbum.set(album);

    this.currentImage.update((value: ImageEntry | undefined) => {
      if(!value) return value;
      if(value?.record){
        value.record.album = album ? [album] : [];
      }

      return {
        ...value
      };
    })
  }

  generateBlankAlbumList(): SortedList<string> {
    return new SortedList((a: string, b: string) => {
      return a.localeCompare(b);
    });
  }

  albumList: WritableSignal<SortedList<string>> = signal(this.generateBlankAlbumList());

  uploadModes: ImageUploadModeOption[] = [
    {
      mode: ImageUploadMode.uploaded,
      modeName: "Simple Upload",
      modeExplaination: "Simply upload your image! It will not be publicly accessible and nothing will be done post processing!"
    }, {
      mode: ImageUploadMode.prePublic,
      modeName: "Make Public",
      modeExplaination: "If public eligible, your image will be made public!"
    }, {
      mode: ImageUploadMode.preProfile,
      modeName: "Make Profile Picture",
      modeExplaination: "If public eligible, your image will be made public and set as your profile Picture!"
    }
  ]

  
  visibilityModes: ImageVisibilityOption[] = [
    {
      option: ImageVisibility.PUBLIC,
      optionName: "Public",
      optionExplaination: "Image is visible to everyone!",
      available: (ir: ImageRecord) => {
        return ir.state == 'NON_ADULT';
      }
    },
    {
      option: ImageVisibility.PUBLIC_AUTH,
      optionName: "Public (Authenticated)",
      optionExplaination: "Image will be available to all Trec-Apps users (age-restrictions apply)",
      available: (ir: ImageRecord) => {
        if(ir.allowPublic) {
          return ir.state == 'PUBLIC';
        }
        return ir.state  == 'PUBLIC' 
          || ir.state == 'ADULT'
          || ir.state == 'NON_ADULT'
      }
    },
    {
      option: ImageVisibility.PROTECTED,
      optionName: "Protected",
      optionExplaination: "Image is available to you and your selection of profiles (latter not implemented yet)",
      available(ir) {
          if(!ir.allowPublic) {
          return ir.state == 'PUBLIC';
        }
        return ir.state  == 'PUBLIC' 
          || ir.state == 'ADULT'
          || ir.state == 'NON_ADULT'
      },
    }
  ]

  updateVisibility() {
    let currentImage = this.currentImage();
    if(!currentImage?.record.id) return;

    this.imageService.updateVisibility(currentImage.record.id, this.targetVisibility()).subscribe({
      next: (obj: ResponseObj) => {
        this.currentVisibility = this.targetVisibility;
      }
    })
  }

  currentUploadMode: WritableSignal<ImageUploadModeOption> = signal(this.uploadModes[0]);

  onOpen(){
    this.albumList.update((value: SortedList<string>) => {
      value.clear();
      return value;
    });
    // this.show = true;
    this.addedAlbum.set(false);
    this.imageEntries.set([]);
    this.currentImagePage.set(0);
    this.retrieveImages();
  }

  retrievingImages: boolean = false;
  retrieveImages(){
    if(this.retrievingImages) return;
    this.retrievingImages = true;
    this.imageService.retrieveImageList(
      this.currentImagePage(), 
      this.size(), 
      (this.retrieveAllImages() || this.app() === "main") ? undefined : this.app(), 
      undefined
    ).subscribe(
      {
        next: (records: ImageRecord[]) => {
          if(records.length < this.size()){
            this.done.set(true);
          } else {
            this.currentImagePage.update(value => value+1);
          }
          
          let newEntries = records.map((ir: ImageRecord) => this.constructImageEntry(ir));

          this.backupImageEntries.update(value => value.concat(newEntries));

          let concateEntries = this.onlyApps() ? newEntries.filter((entry: ImageEntry) => entry.record.app == this.app()) : newEntries;

          this.imageEntries.update((value: ImageEntry[]) => {
            return value.concat(concateEntries);
          })
          
          records.forEach((record: ImageRecord) => this.updateAlbumList(record));
          this.retrievingImages = false;
        },
        error: () => {
          //To do report error
          this.retrievingImages = false;
        }
      }
    )
  }

  // Basic Image Management
  imageEntries: WritableSignal<ImageEntry[]> = signal([]);   // Stores the actual images
  backupImageEntries: WritableSignal<ImageEntry[]> = signal([]);
  size: WritableSignal<number> = signal(20);                  // Number of images to retrieve when seeking them
  currentImagePage: WritableSignal<number> = signal(0);
  done: WritableSignal<boolean> = signal(false);             // Whether there are more images to retrieve
  showAll: WritableSignal<boolean> = signal(true);            // show all images (if app is not 'main', this can be set to false, at which point, only the app images will be shown)


  // Managing the current image
  currentImage: WritableSignal<ImageEntry | undefined> = signal(undefined); // the current image
  prevImage: WritableSignal<ImageEntry | undefined> = signal(undefined); // the previously selected image (helps track Cropping)

  selectedFile:WritableSignal<File | undefined> = signal(undefined);        // Image File
  selectedFileType: WritableSignal<string| undefined> = signal(undefined);  // Type of image to upload (if uploading new image)

  filterBy: WritableSignal<string> = signal("*"); // Show by the current album

  currentVisibility: WritableSignal<ImageVisibility> = signal(ImageVisibility.PROTECTED);
  targetVisibility: WritableSignal<ImageVisibility> = signal(this.currentVisibility());

  onlyApps: WritableSignal<boolean> = signal(false);

  get getImageName(): string {
    return this.currentImage()?.record?.name || "";
  }

  setImageName(event: Event) {
    this.currentImage.update((value: ImageEntry | undefined) => {
      if(value){
        const target = event.target as HTMLInputElement;
        value.record.name = target.value;
      } else {
      return value;
      }
      return {
        ...value
      };
    })
  }

  onShowOnlyApps($event: any) {
    this.onlyApps = $event.target.checked;

    if(this.onlyApps()){
      this.imageEntries.set(this.backupImageEntries().filter((entry: ImageEntry) => entry.record.app == this.app()))
    } else {
      this.imageEntries.set(this.backupImageEntries());
    }
  }

  selectImage() {
    let currentImage = this.currentImage();
    if(!currentImage?.record.id) return;
    let useApp = this.app();
    switch(this.purpose()){
      
      case ImageSelectionPurpose.SELECT:
        this.onSelectImage.emit(this.currentImage());
        this.currentImage.set(undefined);
        this.onClose.emit();
        return;
      // @ts-ignore
      case ImageSelectionPurpose.COVER:
        useApp = `cover-${useApp}`;
      case ImageSelectionPurpose.PROFILE:
        this.imageService.setAsProfile(currentImage.record.id, useApp).subscribe({
          next: (responseObj: ResponseObj) => {
            alert('Successfully set Profile!');
          },
          error: (response: Response) => {
            alert("failed to Set Profile!");
          }
        })
    }
  }


  constructor(private imageService: ImageService){
  }

  // Album Management

  updateAlbumList(record: ImageRecord) {
    for(let album of record.album){
      if(!this.albumList().contains(album)){
        this.albumList.update((value: SortedList<string>) => {
          value.add(album);
          return value;
        })
      }
    }
  }

  getAlbumImage(albumName: string): string {
    let firstRecord: string | undefined;
    for(let c = 0; c < this.imageEntries().length; c++){
      let cur = this.imageEntries()[c];
      if(cur.record.album.includes(albumName)){
        firstRecord = cur.src;
        break;
      }
    }

    return firstRecord || "assets/icons/X-image.png";

  }

  selectingAlbum: WritableSignal<boolean> = signal(false);
  showImages: WritableSignal<boolean> = signal(true);
  addedAlbum: WritableSignal<boolean> = signal(false);

  onAddAlbum(){
    let albumName = prompt("Enter Album Name");
    if(albumName === null) return;

    albumName = albumName.trim();
    console.log("Profile Name: ", albumName)
    console.log(this.albumList().items);

    if(this.albumList().contains(albumName))
    {
      alert("Album already exists!")
      
      return;
    }

    this.albumList.update((value: SortedList<string>) => {
      value.add(albumName);
      return value;
    })
    this.addedAlbum.set(true);
  }

  onSelectAlbum(album: string){
    if(this.selectingAlbum()) return;

    this.selectingAlbum.set(true);

    this.showImages.set(false);

    setTimeout(()=> {
      if(this.filterBy() == album){
        this.filterBy.set("*");
      } else {
        this.filterBy.set(album);
      }
      this.showImages.set(true);

      setTimeout(()=> this.selectingAlbum.set(false), 330)
    }, 330);
  }

  albumChanged: WritableSignal<boolean> = signal(false);

  onAssignAlbum(){
    let currentImage = this.currentImage();
    if(!currentImage?.record.id) return;
    let album: string | undefined;
    if(Array.isArray(currentImage.record.album)){
      album = currentImage.record.album.length ? currentImage.record.album[0] : undefined;
    } else if(typeof currentImage.record.album === "string"){
      album = currentImage.record.album;
    }
    
    this.imageService.updateAlbum(currentImage.record.id, album).subscribe({
      next: (response: ResponseObj) => {
        this.albumChanged.set(false);
      }
    })
  }

  constructImageEntry(record: ImageRecord): ImageEntry {
    let src: string;
    if(record.state == "PUBLIC")
      src = `${environment.image_service_url}/Images/public/${record.id}`;
    else src = "assets/icons/non-profile.png";

    let ret: ImageEntry = {
      record,
      src
    };

    if(record.state != "PUBLIC"){
      if(record.id !== undefined)
        this.imageService.retrieveImageAsBase64(record.id, "whole").subscribe({
          next: (obj: ResponseObj) => {
            ret.src = obj.message.toString();

            this.imageEntries.update((value: ImageEntry[]) => {
              return value.map((entry: ImageEntry) =>  entry)
            })
          }
      })
    }
    return ret;

  }

  commenceImageUpload(){
    let currentImage = this.currentImage();
    if(currentImage && !currentImage.record.id){
      this.imageService.postImage(currentImage, this.currentUploadMode().mode).subscribe({
        next: (resp: ResponseObj) => {
          if(currentImage?.record){
            currentImage.record.id = resp.id?.toString();
            this.currentImage.set(currentImage);
            this.imageEntries.set([currentImage].concat(this.imageEntries()));
            this.backupImageEntries.set([currentImage].concat(this.backupImageEntries()));
            this.albumChanged.set(false);
          }
            
        }
      })
    }
    
  }

  onImageClick(image: ImageEntry){
    this.currentImage.set(image);

    if(image.record.state == "PUBLIC"){
      this.currentVisibility.set(ImageVisibility.PUBLIC);
    } else {
      this.currentVisibility.set(image.record.allowPublic ? ImageVisibility.PUBLIC_AUTH : ImageVisibility.PROTECTED);
    }

    this.targetVisibility.set(this.currentVisibility());

    if(image.record.defaultCrop){
      this.isCropping.set(true);
      setTimeout(() => this.onCropCheck(), 400);
    } else {
      this.isCropping.set(false);
    }
  }

  imageFromDevice(event: any){
    let selectedFile = event.target.files[0];
    this.selectedFile.set(selectedFile);
    if(!selectedFile)return;

    let t = selectedFile.type.toLowerCase().trim();
    for(let possibleType of this.permittedFileTypes) {
      if(t == `image/${possibleType}`)
      {
        this.selectedFileType.set(possibleType);
        break;
      }
    }

    if(this.mbLimit && selectedFile.size >= (this.mbLimit() * bytesInMB) &&
      !confirm(`Your image exceeds the ${this.mbLimit} MB limit for moderation.\n You can still upload the image, but you'll need to contact\n
        the Administrator to use it as a Profile Image or Cover Photo`)){
          return;
    }

    selectedFile.arrayBuffer().then((value: ArrayBuffer)=> {
      let buffer = new Uint8Array(value);

      const STRING_CHAR = buffer.reduce((data, byte)=> {return data + String.fromCharCode(byte);}, '');

      let data = btoa(STRING_CHAR);

      this.isCropping.set(false);

      this.currentImage.set( {
        src: `data:image/${this.selectedFileType()};base64,${data}`,
        record: {
          id: undefined,
          creator: this.imageService.creator,
          name: selectedFile?.name || "",
          defaultCrop: undefined,
          album: [],
          app: this.app(),
          type: "image",
          subType: t,
          state: "NEW",
          createdAt: undefined,
          deleteOn: undefined,
          width: 0,
          height: 0,
          allowPublic: false
        }
      })
    });
    
  }


  //// Image Cropping Support ////

  isCropping: WritableSignal<boolean> = signal(false);
  cropChanged: WritableSignal<boolean> = signal(false);
  isCropDragging: WritableSignal<boolean> = signal(false);
    
  // Track the image parameters
  imageWidth: WritableSignal<number> = signal(0);
  imageWidthReal: WritableSignal<number> = signal(0);
  imageHeight: WritableSignal<number> = signal(0);
  imageHeightReal: WritableSignal<number> =signal( 0);
    
  offset: WritableSignal<{x: number, y: number}> = signal({x:0, y:0});
  squarePosition: WritableSignal<{left: number, top: number}> = signal({left: 50, top: 50});
    
  // Size Attributes
  squareSize: WritableSignal<number> = signal(150);
  isResizing: WritableSignal<boolean> = signal(false);
    
  @ViewChild('selectedImg')
  selectedImg: ElementRef<HTMLImageElement> | undefined;
    
  selectedImagePrev: WritableSignal<string| undefined> = signal(undefined);

  setCropInEntry(){
    if(!this.isCropping() || !this.currentImage()) return;

    // ration to account for the difference between the screen image size (frontend),
    // and the actual image size (as handled on the backend)
    let ratio = this.imageWidthReal() / this.imageWidth();

    // Backend expects these values in integers, so do some rounding
    let actSize = Math.round(this.squareSize() * ratio);
    let cropDetails: number[] = [
      Math.round(this.squarePosition().left * ratio),
      Math.round(this.squarePosition().top * ratio),
      actSize,
      actSize
    ];

    this.currentImage.update((value: ImageEntry | undefined) => {
      if(value){
        value.record.defaultCrop = cropDetails.join(',');
      } else {
        return value;
      }
      return {
        ...value
      };
    })
  }

  onUpdateCrop(){
    let currentImage = this.currentImage();
    if(!currentImage) return;
    
    this.setCropInEntry();

    if(!this.isCropping){
      currentImage.record.defaultCrop = undefined;
    } //else {
    //  currentImage.record.defaultCrop = 
    //    `${this.squarePosition().left},${this.squarePosition().top},${this.squarePosition().left + this.squareSize()},${this.squarePosition().top + this.squareSize()}`;
    //}

    if(currentImage.record.id === undefined){


      return; // Nothing else to do, let user know to post the image
    }

    this.imageService.updateCrop(currentImage.record.id, currentImage.record.defaultCrop).subscribe({
      next: (v: ResponseObj) => {
        alert(v.message);
        this.cropChanged.set(false);
      },
      error: (v: ResponseObj) => alert(v.message)
    });

  }

    // Sets the image width and height stats, to be called before use and after window resizes
    setImageParams(){
      if(!this.selectedImg) return;
  
      this.imageWidth.set(this.selectedImg.nativeElement.width);
      this.imageWidthReal.set(this.selectedImg.nativeElement.naturalWidth);
      this.imageHeight.set(this.selectedImg.nativeElement.height);
      this.imageHeightReal.set(this.selectedImg.nativeElement.naturalHeight);
    }
  
    onDragMouseDown(event: MouseEvent){
      event.preventDefault();
      this.isCropDragging.set(true);
      this.offset.update((value: { x: number; y: number; }) => {
        value.x = event.clientX - this.squarePosition().left;
        value.y = event.clientY - this.squarePosition().top;
        return {x: value.x, y: value.y};
      });

      //console.log("onDragMouseDown: ", this.offset());
    }
  
    @HostListener("window:resize")
    onImageResize(){
      if(!this.selectedImg) return;
  
      let ratio = this.selectedImg.nativeElement.width / this.selectedImg.nativeElement.naturalWidth;
      this.squareSize.update((value: number) => value *= ratio);
      this.squarePosition.update((value: { left: number; top: number; }) => {
        value.left *= ratio;
        value.top *= ratio;
        return {left: value.left, top: value.top};
      });
  
      this.setImageParams();
  
    }

    onDeleteCall(){
      let currentImage = this.currentImage();
      if(!currentImage) return;

      this.imageService.handleDeletion(currentImage.record).subscribe({
        next: (response: ResponseObj) => {
          if(currentImage?.record.deleteOn) {
            currentImage.record.deleteOn = undefined;
          } else if(currentImage?.record && response.id) {
            // if setting deletion, the id of the response should hold the deletion data
            currentImage.record.deleteOn = new Date(response.id.toString());
          }
          this.currentImage.set(currentImage);
        },
        error: (response: ResponseObj) => {
          alert(response.message);
        }
      })
    }

  // To be called when the user clicks on the check to crop checkbox
  onCropCheck(){
    let currentImage = this.currentImage();
    if(!currentImage) return;
  
    if(this.isCropping() && this.selectedImg){
        
      this.setImageParams();
  
      // if currently on the same image, no need to adjust the cropping
      if(currentImage == this.prevImage()) return;

      if(currentImage.record.defaultCrop){

        let works = true;

        let strDimensions = currentImage.record.defaultCrop.split(',');
        try{
          let intDimensions = strDimensions.map(str => Number.parseInt(str));

          let ratio = this.selectedImg.nativeElement.width / this.selectedImg.nativeElement.naturalWidth;
      // this.squareSize.update((value: number) => value *= ratio);

          this.squarePosition.update((value: { left: number; top: number; }) => {
            value.left = intDimensions[0] * ratio;
            value.top = intDimensions[1] * ratio;
            return {  left: value.left, top: value.top};
          })

          this.squareSize.set((intDimensions[3] - intDimensions[1]) * ratio);

          if(intDimensions[0] < 0 || intDimensions[1] < 0 || intDimensions[2] < 0 || intDimensions[3] < 0)
            throw Error("Negative number detected in default crop!");

          if(intDimensions[0] + intDimensions[2] > this.imageWidthReal())
            throw Error("Crop Overflow detected on x-axis");
          if(intDimensions[1] + intDimensions[3] > this.imageHeightReal())
            throw Error("Crop Overflow detected on y-axis");

        } catch(e){
          console.log(e);
          works = false;
        }

        if(works) return;
      }
  
      this.squareSize.set(150);
  
      let remainder = this.imageWidth() - this.squareSize();
      if(remainder < 0) {
        this.squareSize = this.imageWidth;
        this.squarePosition.update((value: { left: number, top: number }) => {
          value.left = 0;
          return {left: value.left, top: value.top};
        })
      } else {
        this.squarePosition.update((value: { left: number, top: number }) => {
          value.left = remainder / 2;
          return {left: value.left, top: value.top};
        })
      }

      remainder = this.imageHeight() - this.squareSize();
      if(remainder < 0) {
        this.squareSize.set(this.imageHeight());
        this.squarePosition.update((value: { left: number, top: number }) => {
          value.top = 0;
          return {left: value.left, top: value.top};
        })
      } else {
        this.squarePosition.update((value: { left: number, top: number }) => {
          value.top = remainder / 2;
          return {left: value.left, top: value.top};
        })
      }
    } else {
      currentImage.record.defaultCrop = undefined;
    }

    this.currentImage.set(currentImage);
  }


  onMoveCropBorders(event: MouseEvent): void {
    if (!this.isCropDragging()) {
      return;
    }
    
    const newLeft = event.clientX - this.offset().x;
    const newTop = event.clientY - this.offset().y;
    
    // Check boundaries to prevent the square from going outside the image
    const squareElement = (event.target as HTMLElement).getBoundingClientRect();
    
    const minLeft = 0;
    const maxLeft = this.imageWidth() - squareElement.width;
    const minTop = 0;
    const maxTop = this.imageHeight() - squareElement.height;
  
    const curLeft = this.squarePosition().left;
    const curTop = this.squarePosition().top;
    
    this.squarePosition().left = Math.max(minLeft, Math.min(maxLeft, newLeft));
    this.squarePosition().top = Math.max(minTop, Math.min(maxTop, newTop));
  
    if(curLeft != this.squarePosition().left || curTop != this.squarePosition().top){
      this.cropChanged.set(true);
    } 
  }

  resizeOffset: WritableSignal<{ x: number, y: number }> = signal({ x: 0, y: 0 });
  
  onResizeStart(event: MouseEvent): void {
    event.stopPropagation();
    this.isResizing.set(true);
    this.isCropDragging.set(false);
    this.resizeOffset.update((value: { x: number; y: number; }) => {
      value.x = event.clientX;
      value.y = event.clientY;
      return {x: value.x, y: value.y};
    });
  }


  onResizeMove(event: MouseEvent): void {
    if (!this.isResizing() || this.isCropDragging()) {
      return;
    }
    
    const sizeChange = (this.resizeOffset().y - event.clientY) * 2;
    
    const newWidth = this.squareSize() + sizeChange;
    
    // Set minimum and maximum size constraints
    const minSize = 100;
    const maxSize = Math.min(this.imageWidth(), this.imageHeight());
  
    let tempSquareSize = Math.max(minSize, Math.min(maxSize, newWidth));
        

    
    // Update the square position to center it (optional)
    // this.squarePosition.left = Math.floor((this.imageWidth - this.squareSize) / 2 - sizeChange * 2);
    // this.squarePosition.top = Math.floor((this.imageHeight - this.squareSize) / 2 - sizeChange * 2);

    let tempSquarePosition = {
      left: this.squarePosition().left,
      top: this.squarePosition().top
    };
    tempSquarePosition.left -= sizeChange / 2;
    tempSquarePosition.top -= sizeChange / 2;

    if(tempSquarePosition.left < 0 || tempSquarePosition.top < 0)
      return;
    const maxLeft = this.imageWidth();
    const maxTop = this.imageHeight();

    if(tempSquarePosition.top + tempSquareSize > maxTop || tempSquarePosition.left + tempSquareSize > maxLeft)
      return;

    this.squarePosition.set(tempSquarePosition);
    this.squareSize.set(tempSquareSize);
    
    this.cropChanged.set(true);

    this.resizeOffset.set({
      x: event.clientX,
      y: event.clientY
    });
  }
    
  @HostListener('mouseup', [])
  onResizeEnd(): void {
    this.isResizing.set(false);
    this.isCropDragging.set(false);
  }
}
