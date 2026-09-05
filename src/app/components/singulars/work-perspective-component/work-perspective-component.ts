import { DatePipe } from '@angular/common';
import { Component, EventEmitter, input, Input, InputSignal, model, ModelSignal, Output, signal, WritableSignal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { FeatureShow, featureShowList } from '../../../models/Model';
import { WorkExpHolder, WorkExp } from '../../../models/WorkExperience';
import { WorkExperienceComponent } from '../work-experience-component/work-experience-component';
import { ElementContainerDirective } from '../../../directives/element-container-directive';
import { ElementItemDirective } from '../../../directives/element-item-directive';
import { PopupComponent } from '../../Lib/popup-component/popup-component';
import { TagInputComponent } from '../../Lib/tag-input-component/tag-input-component';

@Component({
  selector: 'app-work-perspective-component',
  imports: [
    FormsModule, DatePipe, PopupComponent,
    WorkExperienceComponent, TagInputComponent,
    ElementContainerDirective, ElementItemDirective
  ],
  templateUrl: './work-perspective-component.html',
  styleUrl: './work-perspective-component.css'
})
export class WorkPerspectiveComponent {

  isOwned: InputSignal<boolean> = input(false);

  isNew: InputSignal<boolean> = input(false);

  @Output()
  onUpdate = new EventEmitter<WorkExpHolder>();

  @Output()
  onDelete = new EventEmitter();

  isEditing: WritableSignal<boolean> = signal(false);

  perspective: ModelSignal<WorkExpHolder> = model<WorkExpHolder>(new WorkExpHolder());

  featureShowOptions: FeatureShow[] = featureShowList;

  activeExperience: WorkExp | undefined;

  addExperience() {
    let newExp = new WorkExp();
    let perspective = this.perspective();
    if (perspective) {
      perspective.workExperience.push(newExp);
      this.activeExperience = newExp;
    }
  }
}
