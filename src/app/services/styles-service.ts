import { Injectable, signal, WritableSignal } from '@angular/core';

export interface StyleOption {
  cssName: string;
  showName: string;
};

/**
 * Note: Because 'dark' is a prefix for dark mode, 'dark' must never be 
 * one of the 'cssName's
 */
export const stylesList: StyleOption[] = [
  { cssName: "default", showName: "Default" },
  { cssName: "red", showName: "Red" },
  { cssName: "blue", showName: "Blue" },
  { cssName: "green", showName: "Green" },
  { cssName: "yellow", showName: "Yellow" },
  { cssName: "orange", showName: "Orange" },
  { cssName: "purple", showName: "Violet" },
  { cssName: "pink", showName: "Pink" }
];

@Injectable({
  providedIn: 'root',
})
export class StylesService {
    constructor() { }

  style: WritableSignal<string> = signal("default");
  isDark: WritableSignal<boolean> = signal(false);

  darkBackgroundColor: string = "#3b3b3b";
  lightBackgroundColor: string = "#ffffff";

  getAvailableStyles(): StyleOption[] {
    return stylesList;
  }

  isValidStyle(style:string): boolean {
    for(let styleOption of stylesList){
      if(style == styleOption.cssName){ return true; }
    }
    return false;
  }

  setStyle(style: string){
    if(!this.isValidStyle(style)){
      console.warn(`CSS Style ${style} is not a valid style!`);
      return;
    }

    this.style.set(`${this.isDark() ? 'dark-' : ''}${style}`);
  }

  setDarkMode(useDark: boolean) {
    if(useDark == this.isDark()) return; // nothing to be done

    if(this.isDark()){
      // making light
      this.style.set(this.style().substring(5));
    } else {
      this.style.set('dark-' + this.style());
    }
    this.isDark.set(useDark);

    document.body.style.backgroundColor = this.isDark() ? this.darkBackgroundColor : this.lightBackgroundColor;
  }
}
