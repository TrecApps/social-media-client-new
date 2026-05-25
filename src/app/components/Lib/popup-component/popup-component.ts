import { Component, EventEmitter, Input, Output } from '@angular/core';
import { StylesService } from '../../../services/styles-service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-popup-component',
  imports: [CommonModule],
  templateUrl: './popup-component.html',
  styleUrl: './popup-component.css',
})
export class PopupComponent {
    @Input()
  showXBar: boolean = true;

  @Input()
  zIndex: number = 50;

  @Input()
  bgColor: string = "white";

  @Input()
  padding: string = "5px";

  @Output()
  onClose = new EventEmitter<void>();

  ss: StylesService;

  constructor(ss: StylesService){
    this.ss = ss;
  }
}
