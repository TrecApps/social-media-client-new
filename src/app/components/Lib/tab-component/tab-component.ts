import { Component, EventEmitter, model, ModelSignal, Output } from '@angular/core';
import { StylesService } from '../../../services/styles-service';
import { CommonModule } from '@angular/common';

export interface TabOption {
  showTitle: string,
  actTitle: string,
  active?: boolean
}

@Component({
  selector: 'app-tab-component',
  imports: [CommonModule],
  templateUrl: './tab-component.html',
  styleUrl: './tab-component.css',
})
export class TabComponent {
  
  tabs: ModelSignal<TabOption[]> = model([] as TabOption[]);

  @Output()
  tabSelect = new EventEmitter<string>();

  ss: StylesService;

  constructor(ss: StylesService){
    this.ss = ss;
  }

  onSelect(tab: TabOption){

    let newTabs = this.tabs().map(t => {
      if(t.actTitle === tab.actTitle){
        return {
          ...t,
          active: true
        }
      } else {
        return {
          ...t,
          active: false
        }
      }
    });

    this.tabs.set(newTabs);
    this.tabSelect.emit(tab.actTitle);
  }}
