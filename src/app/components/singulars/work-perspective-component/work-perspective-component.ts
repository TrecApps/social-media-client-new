import { DatePipe } from '@angular/common';
import { Component, EventEmitter, Input, model, ModelSignal, Output } from '@angular/core';
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

  @Input()
  isOwned: boolean = false;

  @Input()
  isNew: boolean = false;

  @Output()
  onUpdate = new EventEmitter<WorkExpHolder>();

  @Output()
  onDelete = new EventEmitter();

  isEditing: boolean = false;

  perspective: ModelSignal<WorkExpHolder> = model<WorkExpHolder>(new WorkExpHolder());

  featureShowOptions: FeatureShow[] = featureShowList;

  activeExperience: WorkExp | undefined;

  addExperience() {
    let newExp = new WorkExp();
    this.perspective().workExperience.push(newExp);
    this.activeExperience = newExp;
  }
}
