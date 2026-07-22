import { AfterViewChecked, AfterViewInit, Directive, ElementRef } from '@angular/core';
import { StylesService } from '../services/styles-service';

@Directive({
  selector: '[appElementContainerDirective]',
})
export class ElementContainerDirective implements AfterViewInit, AfterViewChecked{
    currentStyle: string;
  
    constructor(private element: ElementRef, private styleService: StylesService) { 
      this.currentStyle = `element-container-${styleService.style()}`;
    }
    ngAfterViewChecked(): void {
      this.element.nativeElement.classList.remove(this.currentStyle);
      this.currentStyle = `element-container-${this.styleService.style()}`;
      this.element.nativeElement.classList.add(this.currentStyle);
    }
    ngAfterViewInit(): void {
      this.element.nativeElement.classList.add("element-container");
    }
}
