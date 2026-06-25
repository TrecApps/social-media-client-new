import { Component, ElementRef, EventEmitter, input, Input, InputSignal, Output, ViewChild } from '@angular/core';

@Component({
  selector: 'app-bottom-ticker-component',
  imports: [],
  templateUrl: './bottom-ticker-component.html',
  styleUrl: './bottom-ticker-component.css',
})
export class BottomTickerComponent {
    @Input()
  displayText: string = "No more content";

  
  stillMore: InputSignal<boolean> = input(false);

  @Input()
  useHeight: string = "50px";

  @Input()
  spinnerDiameter: number = 50;

  @Input()
  spinnerThickness: number = 5;

  @Output()
  onAppear = new EventEmitter<void>();

  
  inter: IntersectionObserver | undefined;

  @ViewChild('postsListBottom', { read: ElementRef })
  postsListBottom: ElementRef<HTMLDivElement> | undefined;

  
  ngAfterViewInit(): void {
    console.log("Div Element!", this.postsListBottom);
    if(this.postsListBottom)
      this.createAndObserve(this.postsListBottom);
  }


  createAndObserve(element: ElementRef) {
    const options = {
        root: null,
        threshold: 0.1
    };

    this.inter = new IntersectionObserver((entries, observer) => {
        console.log('on')
        entries.forEach((entry: IntersectionObserverEntry) => {
            if(entry.isIntersecting){

              this.onAppear.emit();
            }
        });
    }, options);
    this.inter.observe(element.nativeElement);
  }
}
