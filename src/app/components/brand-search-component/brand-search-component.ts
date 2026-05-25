import { Component, EventEmitter, Input, model, ModelSignal, Output, signal, WritableSignal } from '@angular/core';
import { BrandSearchResult } from '../../models/Brand';
import { Observable } from 'rxjs';
import { StylesService } from '../../services/styles-service';
import { BrandService } from '../../services/brand-service';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-brand-search-component',
  imports: [FormsModule],
  templateUrl: './brand-search-component.html',
  styleUrl: './brand-search-component.css',
})
export class BrandSearchComponent {
    @Input()
  type: string | undefined;

  @Output()
  brandInfoSelected = new EventEmitter<BrandSearchResult>();

  @Input()
  label: string = "Search Brand";

  @Input()
  baseUrl: string = "https://test.trecapps.com/Brands-api/";

  query : ModelSignal<string> = model<string>("");

  styleService: StylesService;

  
  showOptions: boolean = true;
entries: WritableSignal<BrandSearchResult[]> = signal<BrandSearchResult[]>([]);

  constructor(private brandGetService: BrandService, ss: StylesService){
    this.styleService = ss;
  }

  onInputChange() {

    this.showOptions = true;

    let tempName = this.query().trim();
    if(tempName){
      let observable: Observable<BrandSearchResult[]> = this.type ? 
        this.brandGetService.searchByNameAndType(this.baseUrl, tempName, this.type) :
        this.brandGetService.searchByName(this.baseUrl, tempName);
       observable.subscribe({
        next: (brands: BrandSearchResult[]) => this.entries.set(brands)
       });
    } else {
      this.entries.set([]);
    }
  }


    onBrandSelected(selection: BrandSearchResult) {
    this.showOptions = false;
    this.brandInfoSelected.emit(selection);
  }
}
