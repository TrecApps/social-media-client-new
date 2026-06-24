import { Component, HostListener, Input, signal, WritableSignal } from '@angular/core';

@Component({
  selector: 'app-duo-content-component',
  imports: [],
  templateUrl: './duo-content-component.html',
  styleUrl: './duo-content-component.css',
})
export class DuoContentComponent {
    ngAfterViewInit(): void {
    this.isDesktop = window.innerWidth >= 768;
  }

  @Input()
  mainText: string = "";

  @Input()
  flexGap: string = "5px";

  @Input()
  minWIdth: string = "48%";

  @Input()
  rightMaxWidth: string = "auto";

  @Input()
  leftMaxWidth: string = "auto";

  isDesktop : boolean = true;

  @HostListener('window:resize', ['$event'])
  onResize(event: any) {
    this.isDesktop = event.target.innerWidth >= 768;
  }

  mobileShowRight: WritableSignal<boolean> = signal(true);
}
