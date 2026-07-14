import { Component, model, ModelSignal } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-tag-input-component',
  imports: [FormsModule],
  templateUrl: './tag-input-component.html',
  styleUrl: './tag-input-component.css',
})
export class TagInputComponent {
    tags: ModelSignal<string[]>= model<string[]>([]);

  curTag: string = "";

  addTag(){
    let tags = this.tags();
    if(!tags){ return;}
    if(!tags.includes(this.curTag)){
      let ret = [...tags, this.curTag];
      this.tags.set(ret);
    }
    this.curTag = "";
  }

  removeTag(t: string){
    let tags = this.tags();
    if(!tags){ return;}
    this.tags.update(() => tags.filter((e: string) => t != e));
  }
}
