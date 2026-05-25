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
    if(!this.tags().includes(this.curTag)){
      let ret = [...this.tags(), this.curTag];
      this.tags.set(ret);
    }
    this.curTag = "";
  }

  removeTag(t: string){
    this.tags.update((tags: string[]) => tags.filter((e: string) => t != e));
  }
}
