import { Component, EventEmitter, Input, input, model, ModelSignal, Output, signal, WritableSignal } from '@angular/core';
import { Education, EduDegree, EduDegreeMap, eduDegreeMap, monthList } from '../../../models/Education';
import { FormsModule } from '@angular/forms';
import { environment } from '../../../environment/environment';
import { Subject, SubjectMap, subjectMap } from '../../../models/EduSubject';
import { featureShowList } from '../../../models/Model';
import { ElementContainerDirective } from '../../../directives/element-container-directive';
import { ElementItemDirective } from '../../../directives/element-item-directive';
import { BrandSearchComponent } from '../../brand-search-component/brand-search-component';
import { PopupComponent } from '../../Lib/popup-component/popup-component';
import { BrandSearchResult } from '../../../models/Brand';

@Component({
  selector: 'app-edit-education',
  imports: [
    FormsModule,
    PopupComponent, BrandSearchComponent,
    ElementContainerDirective, ElementItemDirective],
  templateUrl: './edit-education.html',
  styleUrl: './edit-education.css'
})
export class EditEducation {

  education: ModelSignal<Education | undefined> = model<Education | undefined>();

  @Input("isSelf")
  isSelf: boolean = false;

  @Output()
  onUpdate = new EventEmitter<void>();

  @Output()
  onDelete = new EventEmitter<void>();

  isEditing: Education | undefined = undefined;

  schoolSelection: BrandSearchResult | undefined;

  degreeList: EduDegreeMap[] = eduDegreeMap;

  subjectList: SubjectMap[] = subjectMap;

  baseUrl: string = environment.resource_service_url;

  visibilityList = featureShowList;

  constructor() {
    this.education.subscribe((edu) => {

    });
  }

  onSubjectAddEvent(majors: boolean, event: any){
    //let chEvent

    let subject: Subject | '' | null | undefined = event.target?.value;
    if(subject) this.onSubjectAdd(majors, subject);
  }

  onSubjectAdd(majors: boolean, subject: Subject) {
    if(!this.isEditing) return;

    for(let mapping of subjectMap){
      if(mapping.display == subject){
        subject = mapping.subject;
        break;
      }
    }

    if(majors){
      if(!this.isEditing.majors.includes(subject)) this.isEditing.majors.push(subject);
    } else {
      if(!this.isEditing.minors.includes(subject)) this.isEditing.minors.push(subject);
    }
    this.education.set({...this.isEditing});
  }

  removeSubject(majors: boolean, subject: Subject){
    if(!this.isEditing) return;
    if(majors) this.isEditing.majors = this.isEditing.majors.filter((val: Subject) => val != subject);
    else this.isEditing.minors = this.isEditing.minors.filter((val: Subject) => val != subject);
    this.education.set({...this.isEditing});
  }

  onSchoolSelected(event: BrandSearchResult){
    let isEditing = this.isEditing;
    if(!isEditing) return;
    isEditing.schoolName = event.brand.names[0];
    isEditing.schoolId = event.brand.id;
    this.schoolSelection = event;
    this.isEditing = {...isEditing};
  }

  doUpdate(){
    if(!this.isEditing) return;
    this.education.set({...this.isEditing});
    this.onUpdate.emit();
    this.isEditing = undefined;
  }

  monthList = monthList;

}
