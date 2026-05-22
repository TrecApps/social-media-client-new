import { Pipe, PipeTransform } from '@angular/core';
import { ImageEntry } from '../models/images';

@Pipe({
  name: 'imageAlbumFilter',
})
export class ImageAlbumFilterPipe implements PipeTransform {
  transform(value: ImageEntry[], by: string): ImageEntry[] {

    if("*" == by)
      return value;
    return value.filter((entry: ImageEntry) => entry.record.album.includes(by));
  }

}
