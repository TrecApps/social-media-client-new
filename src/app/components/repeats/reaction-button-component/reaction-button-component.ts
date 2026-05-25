import { Component, EventEmitter, Input, Output } from '@angular/core';

export class ReactionEvent {
  type: string;
  isSelected: boolean;

  constructor(t: string, is: boolean){
    this.isSelected = is;
    this.type = t;
  }
}


@Component({
  selector: 'app-reaction-button-component',
  imports: [],
  templateUrl: './reaction-button-component.html',
  styleUrl: './reaction-button-component.css'
})
export class ReactionButtonComponent {

  @Input()
  divClass:String = "post-reaction-holder";

  @Input()
  reactionType: string = "_";

  @Input()
  isSelected: boolean = false;

  // @Input()
  // positiveReaction: boolean = true;

  @Output()
  onSelectedEmitter = new EventEmitter<ReactionEvent>();

  @Input()
  count: number = 0;

  onSelected(){
    this.onSelectedEmitter.emit(new ReactionEvent(this.reactionType, this.isSelected));
  }

  setCount(count: number){
    this.count = count;
  }
}
