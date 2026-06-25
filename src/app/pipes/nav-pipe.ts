import { Pipe, PipeTransform } from '@angular/core';

export enum NavOptionShow {
  BASIC_DESKTOP,      // On Desktop, show on the left side of the top bar
  OPTION_DESKTOP,     // On Desktop, show towards the right
  BASIC_DESK_NO_MOB,  // Like "BASIC_DESKTOP", but don't show in mobile mode
  OPTION_DESK_NO_MOB, // Like "OPTION_DESKTOP", but don't show in mobile mode
  ONLY_MOBILE         // Only show in mobile mode
}

export interface NavOption {
  title: string;
  displayText: string;
  navLink?: string;
  baseImg?: string;
  hoverImg?: string;
  focusImg?: string;
  showOption: NavOptionShow;
  isHovering?: boolean | undefined;
  isFocusing?: boolean | undefined;
  notifyCount?: number | undefined;
}

@Pipe({
  name: 'nav',
})
export class NavPipe implements PipeTransform {
  transform(value: NavOption[], ...args: NavOptionShow[]): NavOption[] {
    return value.filter((option: NavOption) => args.includes(option.showOption));
  }
}
