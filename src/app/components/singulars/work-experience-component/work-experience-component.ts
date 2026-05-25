import { Component, Input, model, ModelSignal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { WorkExp } from '../../../models/WorkExperience';
import { DatePipe } from '@angular/common';
import { ElementContainerDirective } from '../../../directives/element-container-directive';
import { ElementItemDirective } from '../../../directives/element-item-directive';

@Component({
  selector: 'app-work-experience-component',
  imports: [
    FormsModule, DatePipe,
    ElementContainerDirective, ElementItemDirective
  ],
  templateUrl: './work-experience-component.html',
  styleUrl: './work-experience-component.css'
})
export class WorkExperienceComponent {

  @Input()
  isOwned: boolean = false;

  isEditing: boolean = false;

  experience: ModelSignal<WorkExp> = model<WorkExp>(new WorkExp());

  tempDate: Date = new Date();

  subExperience: WorkExp | undefined;

  onCurrentWorkHere(isCurrentlyHere: boolean){
    let exp = this.experience();
    if(exp.endDate){
      this.tempDate = exp.endDate;
    }
    exp.endDate = isCurrentlyHere ? undefined : this.tempDate;
  }
}
