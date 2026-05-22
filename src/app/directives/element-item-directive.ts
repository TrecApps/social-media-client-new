import { AfterViewChecked, AfterViewInit, Directive, ElementRef } from '@angular/core';
import { StylesService } from '../services/styles-service';

@Directive({
  selector: '[appElementItemDirective]',
})
export class ElementItemDirective implements AfterViewInit, AfterViewChecked{
  
  currentStyle: string;

  constructor(private element: ElementRef, private styleService: StylesService) { 
    this.currentStyle = `element-item-${styleService.style()}`;
  }
  ngAfterViewChecked(): void {
    this.element.nativeElement.classList.remove(this.currentStyle);
    this.currentStyle = `element-item-${this.styleService.style()}`;
    this.element.nativeElement.classList.add(this.currentStyle);
  }
  ngAfterViewInit(): void {
    this.element.nativeElement.classList.add("element-item");
  }
}
