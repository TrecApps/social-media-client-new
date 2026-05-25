import { Component, EventEmitter, input, Input, InputSignal, Output } from '@angular/core';
import { NgClass } from '@angular/common';
import { ElementContainerDirective } from '../../../directives/element-container-directive';

@Component({
  selector: 'app-up-slider-component',
  imports: [ElementContainerDirective, NgClass],
  templateUrl: './up-slider-component.html',
  styleUrl: './up-slider-component.css',
})
export class UpSliderComponent {

  isActive: InputSignal<boolean> = input<boolean>(false);

  @Output()
  onClose = new EventEmitter();

  zIndex: InputSignal<number> = input<number>(10);

  useMaxHeight: InputSignal<string> = input<string>('auto'); 

  useHeight: InputSignal<string> = input<string>('auto'); 

  constructor(){
  }
}
