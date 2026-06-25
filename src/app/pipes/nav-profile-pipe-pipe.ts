import { Pipe, PipeTransform } from '@angular/core';

export type BooleanResponder = () => boolean;

export interface ProfileItem {
  item: string;
  displayItem: string;
  showFilter?: BooleanResponder;
}

@Pipe({
  name: 'navProfilePipe',
})
export class NavProfilePipe implements PipeTransform {

  transform(value: ProfileItem[]): ProfileItem[] {
    return value.filter((item: ProfileItem) => !item.showFilter || item.showFilter());
  }
}
